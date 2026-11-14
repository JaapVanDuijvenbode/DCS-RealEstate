-- LayeredCake MOVE: release 1 core schema
-- Locations, rooms, furniture (items), boxes, photos, move stages, auth helpers.
-- Every table has Row Level Security: members (any profile) can read and write,
-- only super users can delete.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('super_user', 'contributor');
create type public.location_kind as enum ('source', 'destination');
create type public.disposition as enum (
  'zelf', 'verhuisbedrijf', 'achterlaten', 'verkopen', 'doneren', 'afvoeren', 'opslag'
);
create type public.move_status as enum (
  'geinventariseerd', 'ingepakt', 'geladen', 'aangekomen', 'uitgepakt',
  'achtergelaten', 'verkocht', 'gedoneerd', 'afgevoerd', 'in_opslag'
);
create type public.sale_status as enum ('te_koop', 'gereserveerd', 'verkocht', 'opgehaald');
create type public.room_readiness as enum ('niet_gestart', 'in_uitvoering', 'bewoonbaar', 'gereed');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  username text unique check (username is null or username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text,
  role public.member_role not null default 'contributor',
  locale text not null default 'nl' check (locale in ('nl', 'en')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, lower(new.email), split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_super_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_user');
$$;

-- Users may update their own display name, username and locale, never their role.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role and SQL editor (admin bootstrap).
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_super_user() then
    raise exception 'Only super users can change roles';
  end if;
  if new.email is distinct from old.email then
    raise exception 'E-mail is managed by authentication';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------------------------------------------------------------------------
-- Locations and rooms
-- ---------------------------------------------------------------------------
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  name text not null,
  address text,
  kind public.location_kind not null,
  sort int not null default 0
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,12}$'),
  name_nl text not null,
  name_en text not null,
  floor_code text not null,          -- BG, 1E, 2E, ZO, EXT
  floor_nl text not null,
  floor_en text not null,
  sort int not null default 0,
  readiness public.room_readiness not null default 'niet_gestart',
  default_dest_room_id uuid references public.rooms (id) on delete set null,
  default_interim_room_id uuid references public.rooms (id) on delete set null,
  default_interim_until date,
  archived boolean not null default false,
  unique (location_id, code)
);

-- ---------------------------------------------------------------------------
-- Box types, move stages
-- ---------------------------------------------------------------------------
create table public.box_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  outer_l_cm numeric(6, 1) not null check (outer_l_cm > 0),
  outer_w_cm numeric(6, 1) not null check (outer_w_cm > 0),
  outer_h_cm numeric(6, 1) not null check (outer_h_cm > 0),
  wall_cm numeric(4, 1) not null default 1 check (wall_cm >= 0),
  max_kg numeric(5, 1) not null check (max_kg > 0),
  is_default boolean not null default false
);

create table public.move_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_nl text not null,
  name_en text not null,
  starts_on date,
  ends_on date,
  sort int not null default 0
);

-- ---------------------------------------------------------------------------
-- Furniture and appliances (individual items)
-- ---------------------------------------------------------------------------
create table public.items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  dest_room_id uuid references public.rooms (id) on delete set null,
  interim_room_id uuid references public.rooms (id) on delete set null,
  interim_until date,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'meubel',
  quantity int not null default 1 check (quantity > 0),
  length_cm numeric(6, 1) check (length_cm > 0),
  width_cm numeric(6, 1) check (width_cm > 0),
  height_cm numeric(6, 1) check (height_cm > 0),
  weight_kg numeric(6, 1) check (weight_kg >= 0),
  fragile boolean not null default false,
  value_eur numeric(10, 2) check (value_eur >= 0),       -- including VAT
  disposition public.disposition not null default 'zelf',
  status public.move_status not null default 'geinventariseerd',
  owner_id uuid references public.profiles (id) on delete set null,
  notes text,
  asking_price_eur numeric(10, 2) check (asking_price_eur >= 0),
  sale_platform text,
  listing_url text,
  buyer text,
  sale_price_eur numeric(10, 2) check (sale_price_eur >= 0),
  sale_status public.sale_status,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index items_room_idx on public.items (room_id);
create index items_dest_idx on public.items (dest_room_id);

-- ---------------------------------------------------------------------------
-- Boxes
-- ---------------------------------------------------------------------------
create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  seq int not null,
  room_id uuid not null references public.rooms (id) on delete restrict,
  dest_room_id uuid references public.rooms (id) on delete set null,
  interim_room_id uuid references public.rooms (id) on delete set null,
  interim_until date,
  box_type_id uuid references public.box_types (id) on delete set null,
  contents text not null default '',
  weight_kg numeric(5, 1) check (weight_kg >= 0),
  value_eur numeric(10, 2) check (value_eur >= 0),
  fragile boolean not null default false,
  heavy boolean not null default false,
  this_side_up boolean not null default false,
  disposition public.disposition not null default 'zelf',
  status public.move_status not null default 'geinventariseerd',
  packed_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, seq)
);
create index boxes_room_idx on public.boxes (room_id);

-- Box code: <location code>-<room code>-<3-digit sequence>, e.g. P7-WK-014.
create or replace function public.assign_box_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  loc_code text;
  room_code text;
begin
  select l.code, r.code into loc_code, room_code
  from public.rooms r join public.locations l on l.id = r.location_id
  where r.id = new.room_id;

  -- Serialise code assignment per room.
  perform pg_advisory_xact_lock(hashtext(new.room_id::text));

  if new.seq is null then
    select coalesce(max(seq), 0) + 1 into new.seq from public.boxes where room_id = new.room_id;
  end if;
  if new.code is null or new.code = '' then
    new.code := loc_code || '-' || room_code || '-' || lpad(new.seq::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger boxes_assign_code
  before insert on public.boxes
  for each row execute function public.assign_box_code();

-- ---------------------------------------------------------------------------
-- Photos (Supabase Storage bucket "photos")
-- ---------------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  item_id uuid references public.items (id) on delete cascade,
  box_id uuid references public.boxes (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(item_id, box_id, room_id) = 1)
);

-- ---------------------------------------------------------------------------
-- Status history (used by scanning in release 2, written from release 1)
-- ---------------------------------------------------------------------------
create table public.status_events (
  id bigint generated always as identity primary key,
  box_id uuid references public.boxes (id) on delete cascade,
  item_id uuid references public.items (id) on delete cascade,
  status public.move_status not null,
  user_id uuid references public.profiles (id) on delete set null default auth.uid(),
  note text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(box_id, item_id) = 1)
);

-- BEFORE trigger keeps updated_at current; AFTER trigger writes the status history.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.log_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    if tg_table_name = 'boxes' then
      insert into public.status_events (box_id, status) values (new.id, new.status);
    else
      insert into public.status_events (item_id, status) values (new.id, new.status);
    end if;
  end if;
  return null;
end;
$$;
create trigger items_touch before update on public.items
  for each row execute function public.touch_updated_at();
create trigger boxes_touch before update on public.boxes
  for each row execute function public.touch_updated_at();
create trigger items_status_log after insert or update of status on public.items
  for each row execute function public.log_status_event();
create trigger boxes_status_log after insert or update of status on public.boxes
  for each row execute function public.log_status_event();

-- ---------------------------------------------------------------------------
-- E-mail sign-in codes (service role only: RLS on, no policies)
-- ---------------------------------------------------------------------------
create table public.otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_challenges_user_idx on public.otp_challenges (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Room statistics view (runs with the caller's permissions)
-- ---------------------------------------------------------------------------
create view public.room_stats
with (security_invoker = true) as
select
  r.id as room_id,
  (select count(*) from public.items i where i.room_id = r.id) as item_count,
  (select count(*) from public.boxes b where b.room_id = r.id) as box_count,
  (select count(*) from public.boxes b where b.room_id = r.id and b.status <> 'geinventariseerd') as boxes_packed,
  (select count(*) from public.items i where i.dest_room_id = r.id) + (select count(*) from public.boxes b where b.dest_room_id = r.id) as incoming_count
from public.rooms r;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.rooms enable row level security;
alter table public.box_types enable row level security;
alter table public.move_stages enable row level security;
alter table public.items enable row level security;
alter table public.boxes enable row level security;
alter table public.photos enable row level security;
alter table public.status_events enable row level security;
alter table public.otp_challenges enable row level security;

create policy profiles_read on public.profiles for select using (public.is_member());
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_super_user())
  with check (id = auth.uid() or public.is_super_user());

-- Reference data: members read, super users manage.
create policy locations_read on public.locations for select using (public.is_member());
create policy locations_manage on public.locations for all using (public.is_super_user()) with check (public.is_super_user());
create policy rooms_read on public.rooms for select using (public.is_member());
create policy rooms_manage on public.rooms for all using (public.is_super_user()) with check (public.is_super_user());
create policy box_types_read on public.box_types for select using (public.is_member());
create policy box_types_manage on public.box_types for all using (public.is_super_user()) with check (public.is_super_user());
create policy move_stages_read on public.move_stages for select using (public.is_member());
create policy move_stages_manage on public.move_stages for all using (public.is_super_user()) with check (public.is_super_user());

-- Inventory: members read, insert and update; super users delete.
create policy items_read on public.items for select using (public.is_member());
create policy items_insert on public.items for insert with check (public.is_member());
create policy items_update on public.items for update using (public.is_member()) with check (public.is_member());
create policy items_delete on public.items for delete using (public.is_super_user());

create policy boxes_read on public.boxes for select using (public.is_member());
create policy boxes_insert on public.boxes for insert with check (public.is_member());
create policy boxes_update on public.boxes for update using (public.is_member()) with check (public.is_member());
create policy boxes_delete on public.boxes for delete using (public.is_super_user());

create policy photos_read on public.photos for select using (public.is_member());
create policy photos_insert on public.photos for insert with check (public.is_member());
create policy photos_delete on public.photos for delete using (public.is_super_user() or created_by = auth.uid());

create policy status_events_read on public.status_events for select using (public.is_member());

-- ---------------------------------------------------------------------------
-- Storage bucket for photos (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy photos_bucket_read on storage.objects for select
  using (bucket_id = 'photos' and public.is_member());
create policy photos_bucket_insert on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_member());
create policy photos_bucket_delete on storage.objects for delete
  using (bucket_id = 'photos' and (public.is_super_user() or owner = auth.uid()));

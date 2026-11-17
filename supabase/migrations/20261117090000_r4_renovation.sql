-- LayeredCake MOVE: release 4, renovation planning for Nieuwe Rijn 98
-- Projects with sub-items (parent_id) and dependencies, suppliers, building
-- elements, mood boards and subsidies. Same security model as release 1:
-- members read, insert and update; super users delete.

-- ---------------------------------------------------------------------------
-- Enums (values follow the project charter: Fase 0 to 5, information status)
-- ---------------------------------------------------------------------------
create type public.reno_phase as enum ('fase_0', 'fase_1', 'fase_2', 'fase_3', 'fase_4', 'fase_5');
create type public.reno_status as enum ('idee', 'te_onderzoeken', 'gepland', 'in_uitvoering', 'wacht', 'gereed');
create type public.reno_category as enum ('noodzakelijk_herstel', 'preventief_onderhoud', 'comfort', 'esthetisch');
create type public.reno_priority as enum ('laag', 'middel', 'hoog');
create type public.monument_impact as enum ('geen', 'laag', 'hoog', 'onbekend');
create type public.permit_need as enum ('ja', 'nee', 'te_onderzoeken');
create type public.info_status as enum ('vastgesteld', 'aannemelijk', 'onbekend', 'te_onderzoeken', 'besloten', 'voorgesteld');
create type public.mood_kind as enum ('image', 'link', 'color', 'material');
create type public.mood_verdict as enum ('favoriet', 'optie', 'afgewezen');

-- ---------------------------------------------------------------------------
-- Building elements: parts of the building that are not rooms
-- ---------------------------------------------------------------------------
create table public.building_elements (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9-]{2,16}$'),
  name_nl text not null,
  name_en text not null,
  sort int not null default 0,
  unique (location_id, code)
);

-- ---------------------------------------------------------------------------
-- Suppliers, contractors and advisors
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  trade text,                       -- architect, aannemer, schilder, installateur, ...
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  monument_experience boolean not null default false,
  rating int check (rating between 1 and 5),
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Renovation projects (a sub-item is a project with parent_id)
-- ---------------------------------------------------------------------------
create table public.reno_projects (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.reno_projects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  phase public.reno_phase not null default 'fase_0',
  status public.reno_status not null default 'idee',
  category public.reno_category not null default 'noodzakelijk_herstel',
  priority public.reno_priority not null default 'middel',
  sort_order double precision not null default 0,
  owner_id uuid references public.profiles (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  start_date date,
  end_date date,
  -- Amounts in EUR including VAT (PRD: incl. VAT by default)
  estimate_eur numeric(12, 2) check (estimate_eur >= 0),
  quote_eur numeric(12, 2) check (quote_eur >= 0),
  contract_eur numeric(12, 2) check (contract_eur >= 0),
  actual_eur numeric(12, 2) check (actual_eur >= 0),
  forecast_eur numeric(12, 2) check (forecast_eur >= 0),
  cost_basis text,                    -- what the estimate is based on
  uncertainty_pct int check (uncertainty_pct between 0 and 200),
  -- Monument and permit fields
  monument_impact public.monument_impact not null default 'onbekend',
  permit_required public.permit_need not null default 'te_onderzoeken',
  permit_status text,
  permit_reference text,
  permit_submitted_on date,
  permit_decided_on date,
  heritage_advice text,               -- Erfgoed Leiden / commissie omgevingskwaliteit
  info_status public.info_status not null default 'voorgesteld',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (parent_id is null or parent_id <> id)
);
create index reno_projects_parent_idx on public.reno_projects (parent_id);
create index reno_projects_status_idx on public.reno_projects (status, sort_order);

-- A sub-item may not be its own ancestor.
create or replace function public.reno_check_parent()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is not null and exists (
    with recursive up as (
      select id, parent_id from public.reno_projects where id = new.parent_id
      union all
      select p.id, p.parent_id from public.reno_projects p join up on p.id = up.parent_id
    )
    select 1 from up where id = new.id
  ) then
    raise exception 'A project cannot be placed under one of its own sub-items';
  end if;
  return new;
end;
$$;

create trigger reno_projects_parent_check
  before insert or update of parent_id on public.reno_projects
  for each row execute function public.reno_check_parent();

create trigger reno_projects_touch before update on public.reno_projects
  for each row execute function public.touch_updated_at();
create trigger vendors_touch before update on public.vendors
  for each row execute function public.touch_updated_at();

-- Rooms and building elements a project applies to.
create table public.reno_project_targets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reno_projects (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete cascade,
  element_id uuid references public.building_elements (id) on delete cascade,
  check (num_nonnulls(room_id, element_id) = 1),
  unique (project_id, room_id),
  unique (project_id, element_id)
);

-- "project_id depends on depends_on_id": the latter must finish first.
create table public.reno_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reno_projects (id) on delete cascade,
  depends_on_id uuid not null references public.reno_projects (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (project_id <> depends_on_id),
  unique (project_id, depends_on_id)
);

create or replace function public.reno_check_dependency_cycle()
returns trigger
language plpgsql
as $$
begin
  if exists (
    with recursive chain as (
      select depends_on_id as id from public.reno_dependencies where project_id = new.depends_on_id
      union
      select d.depends_on_id from public.reno_dependencies d join chain c on d.project_id = c.id
    )
    select 1 from chain where id = new.project_id
  ) then
    raise exception 'This dependency would create a loop';
  end if;
  return new;
end;
$$;

create trigger reno_dependencies_cycle_check
  before insert or update on public.reno_dependencies
  for each row execute function public.reno_check_dependency_cycle();

-- ---------------------------------------------------------------------------
-- Mood boards: per room, building element or project
-- ---------------------------------------------------------------------------
create table public.mood_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms (id) on delete cascade,
  element_id uuid references public.building_elements (id) on delete cascade,
  project_id uuid references public.reno_projects (id) on delete cascade,
  kind public.mood_kind not null,
  title text,
  storage_path text,                 -- image in the private "photos" bucket
  url text,                          -- web link (Pinterest, Instagram, supplier page)
  color_code text,                   -- RAL or NCS code
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  vendor_id uuid references public.vendors (id) on delete set null,
  price_eur numeric(12, 2) check (price_eur >= 0),
  note text,
  verdict public.mood_verdict not null default 'optie',
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (num_nonnulls(room_id, element_id, project_id) = 1),
  check (kind <> 'image' or storage_path is not null),
  check (kind <> 'link' or url is not null),
  check (kind <> 'color' or color_code is not null)
);
create index mood_items_room_idx on public.mood_items (room_id);
create index mood_items_element_idx on public.mood_items (element_id);
create index mood_items_project_idx on public.mood_items (project_id);

-- ---------------------------------------------------------------------------
-- Subsidies and monument financing per project
-- ---------------------------------------------------------------------------
create table public.reno_subsidies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reno_projects (id) on delete cascade,
  scheme text not null,              -- e.g. Restauratiefonds, SIM
  applied_eur numeric(12, 2) check (applied_eur >= 0),
  granted_eur numeric(12, 2) check (granted_eur >= 0),
  applied_on date,
  decided_on date,
  conditions text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.building_elements enable row level security;
alter table public.vendors enable row level security;
alter table public.reno_projects enable row level security;
alter table public.reno_project_targets enable row level security;
alter table public.reno_dependencies enable row level security;
alter table public.mood_items enable row level security;
alter table public.reno_subsidies enable row level security;

create policy building_elements_read on public.building_elements for select using (public.is_member());
create policy building_elements_manage on public.building_elements for all using (public.is_super_user()) with check (public.is_super_user());

do $$
declare t text;
begin
  foreach t in array array['vendors', 'reno_projects', 'reno_project_targets', 'reno_dependencies', 'mood_items', 'reno_subsidies'] loop
    execute format('create policy %1$s_read on public.%1$s for select using (public.is_member())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert with check (public.is_member())', t);
    execute format('create policy %1$s_update on public.%1$s for update using (public.is_member()) with check (public.is_member())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete using (public.is_super_user())', t);
  end loop;
end $$;

-- Targets, dependencies and own mood items are working links: any member may remove them.
drop policy reno_project_targets_delete on public.reno_project_targets;
create policy reno_project_targets_delete on public.reno_project_targets for delete using (public.is_member());
drop policy reno_dependencies_delete on public.reno_dependencies;
create policy reno_dependencies_delete on public.reno_dependencies for delete using (public.is_member());
drop policy mood_items_delete on public.mood_items;
create policy mood_items_delete on public.mood_items for delete using (public.is_super_user() or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed: building elements of Nieuwe Rijn 98 (PRD section B1)
-- ---------------------------------------------------------------------------
insert into public.building_elements (location_id, code, name_nl, name_en, sort)
select l.id, e.code, e.name_nl, e.name_en, e.sort
from public.locations l
cross join (values
  ('GEV-VOOR',  'Voorgevel (tuitgevel)',     'Front facade (neck gable)', 1),
  ('GEV-ACHT',  'Achtergevel',               'Rear facade',               2),
  ('DAK',       'Dak',                       'Roof',                      3),
  ('FUND',      'Fundering',                 'Foundation',                4),
  ('KELDER',    'Kelder of kruipruimte',     'Cellar or crawl space',     5),
  ('TRAP',      'Trappen',                   'Stairs',                    6),
  ('KOZ',       'Kozijnen en ramen',         'Window frames and windows', 7),
  ('INST-E',    'Elektra',                   'Electrical',                8),
  ('INST-W',    'Verwarming en warm water',  'Heating and hot water',     9),
  ('INST-S',    'Water en riolering',        'Water and drainage',        10),
  ('INST-V',    'Ventilatie',                'Ventilation',               11),
  ('INST-D',    'Data en domotica',          'Data and home automation',  12)
) as e(code, name_nl, name_en, sort)
where l.code = 'NR98';

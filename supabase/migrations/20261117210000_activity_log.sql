-- LayeredCake MOVE: activity log for the dashboard chart
-- "Who added or changed what, and when". Written by triggers, readable by members.

create type public.activity_action as enum ('insert', 'update', 'delete');

create table public.activity_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  table_name text not null,
  record_id uuid,
  action public.activity_action not null,
  created_at timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_actor_idx on public.activity_log (actor_id, created_at desc);

alter table public.activity_log enable row level security;
create policy activity_log_read on public.activity_log for select using (public.is_member());

-- One row per insert, real update or delete by a signed-in user.
-- Updates that only touch updated_at are ignored; service-role writes have no actor and are skipped.
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    return null;
  end if;
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then
    return null;
  end if;
  insert into public.activity_log (actor_id, table_name, record_id, action)
  values (
    actor,
    tg_table_name,
    case when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid else (to_jsonb(new) ->> 'id')::uuid end,
    lower(tg_op)::public.activity_action
  );
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'items', 'boxes', 'photos', 'rooms',
    'reno_projects', 'reno_project_targets', 'reno_dependencies', 'reno_subsidies',
    'vendors', 'mood_items'
  ] loop
    execute format(
      'create trigger %1$s_activity after insert or update or delete on public.%1$s for each row execute function public.log_activity()',
      t
    );
  end loop;
end $$;

-- Backfill the last 31 days from what is already known:
-- additions from created_by / created_at, changes from the box and item status history.
insert into public.activity_log (actor_id, table_name, record_id, action, created_at)
select created_by, 'items', id, 'insert'::public.activity_action, created_at from public.items
  where created_by is not null and created_at > now() - interval '31 days'
union all
select created_by, 'boxes', id, 'insert'::public.activity_action, created_at from public.boxes
  where created_by is not null and created_at > now() - interval '31 days'
union all
select created_by, 'photos', id, 'insert'::public.activity_action, created_at from public.photos
  where created_by is not null and created_at > now() - interval '31 days'
union all
select created_by, 'reno_projects', id, 'insert'::public.activity_action, created_at from public.reno_projects
  where created_by is not null and created_at > now() - interval '31 days'
union all
select created_by, 'vendors', id, 'insert'::public.activity_action, created_at from public.vendors
  where created_by is not null and created_at > now() - interval '31 days'
union all
select created_by, 'mood_items', id, 'insert'::public.activity_action, created_at from public.mood_items
  where created_by is not null and created_at > now() - interval '31 days'
union all
-- Status changes; the first status of a new box or item is part of its creation, not a change.
select user_id, case when box_id is not null then 'boxes' else 'items' end, coalesce(box_id, item_id), 'update'::public.activity_action, created_at
  from public.status_events
  where user_id is not null and status <> 'geinventariseerd' and created_at > now() - interval '31 days'
order by 5;

-- Counts per day (Amsterdam time), person and kind, for the last 31 days.
create view public.activity_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Europe/Amsterdam')::date as day,
  actor_id,
  count(*) filter (where action = 'insert') as added,
  count(*) filter (where action <> 'insert') as changed
from public.activity_log
where created_at > now() - interval '31 days'
  and actor_id is not null
group by 1, 2;

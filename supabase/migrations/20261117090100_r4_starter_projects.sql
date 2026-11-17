-- LayeredCake MOVE: starter renovation projects from the PRD and project charter.
-- Only facts already decided or stated are filled in; no cost figures.
-- Safe to skip: delete them in the app if you prefer an empty board.

do $$
declare
  nr98 uuid := (select id from public.locations where code = 'NR98');
  p_fund uuid; p_paint_check uuid; p_rooms uuid; p_survey uuid; p_values uuid; p_install uuid;
  r record;
  n int := 0;
begin
  insert into public.reno_projects (title, description, phase, status, category, priority, end_date, info_status, permit_required, monument_impact, sort_order)
  values ('Funderings- en bodemonderzoek',
          'Voorwaarde voor de financiering: uitslag vóór 15 december 2026. Bij middel of hoog risico kan de koop worden ontbonden.',
          'fase_0', 'gepland', 'noodzakelijk_herstel', 'hoog', date '2026-12-15', 'vastgesteld', 'nee', 'geen', 1)
  returning id into p_fund;
  insert into public.reno_project_targets (project_id, element_id)
  select p_fund, id from public.building_elements where location_id = nr98 and code = 'FUND';

  insert into public.reno_projects (title, description, phase, status, category, priority, end_date, info_status, permit_required, monument_impact, sort_order)
  values ('Toetsen welke oppervlakken zonder vergunning geschilderd mogen worden',
          'Met Erfgoed Leiden afstemmen vóór het schilderen van de prioriteitsruimtes. Historische afwerkingen eerst laten beoordelen.',
          'fase_0', 'te_onderzoeken', 'noodzakelijk_herstel', 'hoog', date '2027-01-14', 'te_onderzoeken', 'te_onderzoeken', 'onbekend', 2)
  returning id into p_paint_check;

  insert into public.reno_projects (title, description, phase, status, category, priority, start_date, end_date, info_status, permit_required, monument_impact, sort_order)
  values ('Prioriteitsruimtes gereed voor verhuizing',
          'Schoonmaken, schilderen en veilig maken tussen overdracht en verhuizing (8 februari 2027).',
          'fase_4', 'gepland', 'esthetisch', 'hoog', date '2027-01-15', date '2027-02-07', 'besloten', 'te_onderzoeken', 'onbekend', 3)
  returning id into p_rooms;

  insert into public.reno_dependencies (project_id, depends_on_id) values (p_rooms, p_paint_check);

  for r in
    select rm.id, rm.code, rm.name_nl, rm.floor_code
    from public.rooms rm
    where rm.location_id = nr98 and rm.code in ('1E-WK', '1E-KK', '2E-SLK', 'ZO-SLV', 'ZO-SLA', '1E-KA', '2E-BAD')
    order by rm.sort
  loop
    n := n + 1;
    insert into public.reno_projects (parent_id, title, phase, status, category, priority, start_date, end_date, info_status, permit_required, monument_impact, sort_order)
    values (p_rooms,
            case r.floor_code when 'BG' then 'BG ' when '1E' then '1e ' when '2E' then '2e ' when 'ZO' then 'Zolder ' else '' end
              || r.name_nl || case when r.code = '2E-BAD' then ' en toiletten bruikbaar' else ' gereed' end,
            'fase_4', 'gepland', 'esthetisch', 'hoog', date '2027-01-15', date '2027-02-07', 'besloten', 'te_onderzoeken', 'onbekend', 3 + n * 0.01)
    returning id into p_survey;
    insert into public.reno_project_targets (project_id, room_id) values (p_survey, r.id);
  end loop;

  insert into public.reno_projects (title, phase, status, category, priority, info_status, sort_order)
  values ('Bouwkundige opname', 'fase_0', 'idee', 'noodzakelijk_herstel', 'hoog', 'voorgesteld', 4)
  returning id into p_survey;
  insert into public.reno_projects (title, phase, status, category, priority, info_status, sort_order)
  values ('Monumentale waardenstelling', 'fase_0', 'idee', 'noodzakelijk_herstel', 'middel', 'voorgesteld', 5)
  returning id into p_values;
  insert into public.reno_projects (title, phase, status, category, priority, info_status, sort_order)
  values ('Installatietechnische opname', 'fase_0', 'idee', 'noodzakelijk_herstel', 'middel', 'voorgesteld', 6)
  returning id into p_install;
end $$;

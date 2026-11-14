-- LayeredCake MOVE: release 1 reference data (PRD v1.0, 14 November 2026)

insert into public.locations (code, name, address, kind, sort) values
  ('P7',   'Pioenroos 7',               'Pioenroos 7, Voorhout',            'source',      1),
  ('MK',   'Menken kantoor en opslag',  'Noordwijkerhout',                  'source',      2),
  ('NR98', 'Nieuwe Rijn 98',            'Nieuwe Rijn 98, 2312 JM Leiden',   'destination', 3);

-- Nieuwe Rijn 98: rooms from the Blender massing model (4 Nov 2026), status AANNEMELIJK.
insert into public.rooms (location_id, code, name_nl, name_en, floor_code, floor_nl, floor_en, sort)
select l.id, r.code, r.name_nl, r.name_en, r.floor_code, r.floor_nl, r.floor_en, r.sort
from public.locations l
cross join (values
  ('BG-ENT',   'Entree',                   'Entrance',            'BG', 'Begane grond',    'Ground floor', 101),
  ('BG-TRAP',  'Trap',                     'Stairs',              'BG', 'Begane grond',    'Ground floor', 102),
  ('BG-TOI',   'Toilet',                   'Toilet',              'BG', 'Begane grond',    'Ground floor', 103),
  ('BG-KIT',   'Kitchenette',              'Kitchenette',         'BG', 'Begane grond',    'Ground floor', 104),
  ('BG-KAN',   'Kantoor',                  'Office',              'BG', 'Begane grond',    'Ground floor', 105),
  ('BG-MFR',   'Multifunctionele ruimte',  'Multipurpose room',   'BG', 'Begane grond',    'Ground floor', 106),
  ('BG-BER',   'Berging',                  'Storage',             'BG', 'Begane grond',    'Ground floor', 107),
  ('1E-WK',    'Woonkamer',                'Living room',         '1E', '1e verdieping',   '1st floor',    201),
  ('1E-KK',    'Keuken',                   'Kitchen',             '1E', '1e verdieping',   '1st floor',    202),
  ('1E-OVL',   'Overloop',                 'Landing',             '1E', '1e verdieping',   '1st floor',    203),
  ('1E-KAST',  'Kast',                     'Cupboard',            '1E', '1e verdieping',   '1st floor',    204),
  ('1E-TOI',   'Toilet',                   'Toilet',              '1E', '1e verdieping',   '1st floor',    205),
  ('1E-TER',   'Terras',                   'Terrace',             '1E', '1e verdieping',   '1st floor',    206),
  ('1E-KA',    'Kamer achter',             'Rear room',           '1E', '1e verdieping',   '1st floor',    207),
  ('1E-KV',    'Kamer vleugel',            'Wing room',           '1E', '1e verdieping',   '1st floor',    208),
  ('1E-BER',   'Berging',                  'Storage',             '1E', '1e verdieping',   '1st floor',    209),
  ('1E-KASTV', 'Kast vleugel',             'Wing cupboard',       '1E', '1e verdieping',   '1st floor',    210),
  ('1E-GANG',  'Gang',                     'Corridor',            '1E', '1e verdieping',   '1st floor',    211),
  ('1E-OVLV',  'Overloop vleugel',         'Wing landing',        '1E', '1e verdieping',   '1st floor',    212),
  ('2E-SLK',   'Slaapkamer',               'Bedroom',             '2E', '2e verdieping',   '2nd floor',    301),
  ('2E-BAD',   'Badkamer',                 'Bathroom',            '2E', '2e verdieping',   '2nd floor',    302),
  ('2E-OVL',   'Overloop',                 'Landing',             '2E', '2e verdieping',   '2nd floor',    303),
  ('2E-DT',    'Dakterras',                'Roof terrace',        '2E', '2e verdieping',   '2nd floor',    304),
  ('ZO-SLV',   'Slaapkamer voor',          'Front bedroom',       'ZO', 'Zolder',          'Attic',        401),
  ('ZO-OVL',   'Overloop',                 'Landing',             'ZO', 'Zolder',          'Attic',        402),
  ('ZO-SLA',   'Slaapkamer achter',        'Rear bedroom',        'ZO', 'Zolder',          'Attic',        403)
) as r(code, name_nl, name_en, floor_code, floor_nl, floor_en, sort)
where l.code = 'NR98';

-- Pioenroos 7 and Menken: source rooms.
insert into public.rooms (location_id, code, name_nl, name_en, floor_code, floor_nl, floor_en, sort)
select l.id, r.code, r.name_nl, r.name_en, r.floor_code, r.floor_nl, r.floor_en, r.sort
from public.locations l
cross join (values
  ('HAL',  'Hal',                    'Hallway',              'BG', 'Begane grond',  'Ground floor', 1),
  ('TBG',  'Toilet / badkamer',      'Toilet / bathroom',    'BG', 'Begane grond',  'Ground floor', 2),
  ('WK',   'Woonkamer',              'Living room',          'BG', 'Begane grond',  'Ground floor', 3),
  ('KH',   'Koffiehoek',             'Coffee corner',        'BG', 'Begane grond',  'Ground floor', 4),
  ('KK',   'Keuken',                 'Kitchen',              'BG', 'Begane grond',  'Ground floor', 5),
  ('TUIN', 'Achtertuin en vlonder',  'Backyard and deck',    'BG', 'Begane grond',  'Ground floor', 6),
  ('GAR',  'Garage',                 'Garage',               'BG', 'Begane grond',  'Ground floor', 7),
  ('KAN',  'Kantoor',                'Office',               '1E', '1e verdieping', '1st floor',    8),
  ('SKL',  'Slaapkamer Lois',        'Lois bedroom',         '1E', '1e verdieping', '1st floor',    9),
  ('SKB',  'Slaapkamer Bibi',        'Bibi bedroom',         '1E', '1e verdieping', '1st floor',    10),
  ('BAD',  'Badkamer',               'Full bathroom',        '1E', '1e verdieping', '1st floor',    11),
  ('T1',   'Toilet / badkamer',      'Toilet / bathroom',    '1E', '1e verdieping', '1st floor',    12),
  ('OSK',  'Ouderslaapkamer',        'Master bedroom',       '2E', '2e verdieping', '2nd floor',    13),
  ('GYM',  'Gym / inloopkast',       'Gym / walk-in closet', '2E', '2e verdieping', '2nd floor',    14),
  ('WAS',  'Wasruimte',              'Laundry room',         '2E', '2e verdieping', '2nd floor',    15)
) as r(code, name_nl, name_en, floor_code, floor_nl, floor_en, sort)
where l.code = 'P7';

insert into public.rooms (location_id, code, name_nl, name_en, floor_code, floor_nl, floor_en, sort)
select l.id, r.code, r.name_nl, r.name_en, 'EXT', 'Extern', 'External', r.sort
from public.locations l
cross join (values
  ('KAN', 'Kantoor', 'Office',  1),
  ('OPS', 'Opslag',  'Storage', 2)
) as r(code, name_nl, name_en, sort)
where l.code = 'MK';

-- Default destinations from the room mapping (PRD section B1, status 14 Nov 2026).
with map(loc, src, dest, interim, interim_until) as (values
  ('P7', 'OSK',  '2E-SLK', null, null),
  ('P7', 'SKL',  'ZO-SLV', null, null),
  ('P7', 'SKB',  '1E-KA',  null, null),
  ('P7', 'WK',   '1E-WK',  null, null),
  ('P7', 'KK',   '1E-KK',  null, null),
  ('P7', 'KH',   '1E-KK',  null, null),
  ('P7', 'BAD',  '2E-BAD', null, null),
  ('P7', 'TBG',  'BG-TOI', null, null),
  ('P7', 'T1',   '1E-TOI', null, null),
  ('P7', 'KAN',  'BG-KAN', null, null),
  ('P7', 'GYM',  '1E-KV',  null, null),
  ('P7', 'WAS',  'BG-BER', null, null),
  ('P7', 'HAL',  'BG-ENT', null, null),
  ('P7', 'GAR',  'BG-BER', null, null),
  ('P7', 'TUIN', '1E-TER', null, null),
  ('MK', 'KAN',  'BG-KAN', 'BG-MFR', date '2027-01-15'),
  ('MK', 'OPS',  'BG-BER', null, null)
)
update public.rooms r
set default_dest_room_id = d.id,
    default_interim_room_id = i.id,
    default_interim_until = map.interim_until
from map
join public.locations sl on sl.code = map.loc
join public.locations nl on nl.code = 'NR98'
join public.rooms d on d.location_id = nl.id and d.code = map.dest
left join public.rooms i on i.location_id = nl.id and i.code = map.interim
where r.location_id = sl.id and r.code = map.src;

-- Priority rooms: usable by move-in on 8 Feb 2027.
-- (Readiness starts at niet_gestart; updated by the owners as work progresses.)

insert into public.box_types (name, outer_l_cm, outer_w_cm, outer_h_cm, wall_cm, max_kg, is_default) values
  ('Menken Professional Box', 48.5, 32.5, 36.5, 1, 25, true);

insert into public.move_stages (code, name_nl, name_en, starts_on, ends_on, sort) values
  ('S0',  'Inventarisatie',               'Inventory',                     date '2026-11-14', date '2026-12-11', 0),
  ('S1',  'Uitzoeken en opruimen',        'Sort and declutter',            date '2026-11-14', date '2027-01-31', 1),
  ('S2',  'Inpakken',                     'Packing',                       date '2026-12-07', date '2027-02-07', 2),
  ('S3A', 'Menken kantoor en opslag',     'Menken office and storage',     date '2026-12-14', date '2026-12-18', 3),
  ('S3B', 'Eigen transport Pioenroos 7',  'Own transport Pioenroos 7',     date '2027-01-15', date '2027-02-07', 4),
  ('S4',  'Verhuisdag verhuisbedrijf',    'Moving company day',            date '2027-02-08', date '2027-02-08', 5),
  ('S5',  'Uitpakken en inrichten',       'Unpacking and furnishing',      date '2027-02-08', date '2027-02-28', 6),
  ('S6',  'Oplevering Pioenroos 7',       'Handover Pioenroos 7',          date '2027-02-15', date '2027-02-15', 7);

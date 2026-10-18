-- Light demo rows for the shop tabs.
-- Run after supabase/pulse_ecommerce.sql.
-- Inserts missing sample products, a few months of units, and Q4 2026 rocks.
-- It does not update or delete rows that are already there.
-- Skip this file on the live shop if you do not want the sample SKUs.
--
-- Owners point at King and Mira King, the profiles in kingfamily_seed.sql.
-- Levi is not a kf_users row yet. Add that login from Admin, then set the
-- owner on the rock. The labour budget line is already named Labour (Levi).

insert into public.kf_products (sku, name, unit_cost, sell_price, stock_on_hand, reorder_level, active)
values
  ('PLS-TEE-BLK', 'Black tee', 18, 49, 40, 12, true),
  ('PLS-MUG-WHT', 'White mug', 7, 24, 30, 8, true),
  ('PLS-CAP-NVY', 'Navy cap', 11, 29, 3, 10, true),
  ('PLS-TOTE-NAT', 'Natural tote', 14, 19, 16, 6, true),
  ('PLS-STK-SET', 'Sticker set', 2, 9, 80, 20, true),
  ('PLS-HOOD-GRY', 'Grey hoodie', 42, 89, 8, 4, true)
on conflict (sku) do nothing;

insert into public.kf_product_sales (product_id, month, units_sold, revenue)
select p.id, s.month, s.units_sold, s.revenue
from public.kf_products p
join (
  values
    ('PLS-TEE-BLK', '2026-09', 20, null::numeric),
    ('PLS-TEE-BLK', '2026-10', 14, null::numeric),
    ('PLS-MUG-WHT', '2026-09', 11, null::numeric),
    ('PLS-MUG-WHT', '2026-10', 9, null::numeric),
    ('PLS-CAP-NVY', '2026-09', 6, null::numeric),
    ('PLS-CAP-NVY', '2026-10', 2, null::numeric),
    ('PLS-TOTE-NAT', '2026-09', 4, null::numeric),
    ('PLS-TOTE-NAT', '2026-10', 3, null::numeric),
    ('PLS-STK-SET', '2026-10', 15, null::numeric),
    ('PLS-HOOD-GRY', '2026-09', 5, null::numeric),
    ('PLS-HOOD-GRY', '2026-10', 1, 80::numeric)
) as s(sku, month, units_sold, revenue) on s.sku = p.sku
on conflict (product_id, month) do nothing;

insert into public.kf_rock_quarters (year, quarter, theme, bep, goal, rules)
values (
  2026,
  4,
  'First season online',
  'RM 8,000 a month',
  'RM 15,000 a month',
  E'1. A rock is done when the number moved, not when the slide is pretty.\n2. Updates say what changed this week.\n3. Drop a rock that missed twice rather than carrying it forever.'
)
on conflict (year, quarter) do nothing;

insert into public.kf_rock_departments (quarter_id, name, sort_order)
select q.id, d.name, d.sort_order
from public.kf_rock_quarters q
cross join (
  values
    ('Sales', 0),
    ('Operations', 1),
    ('Product', 2)
) as d(name, sort_order)
where q.year = 2026
  and q.quarter = 4
  and not exists (
    select 1
    from public.kf_rock_departments existing
    where existing.quarter_id = q.id
      and existing.name = d.name
  );

insert into public.kf_rocks (
  department_id, title, notes, owner_id, deadline, progress, updates, remarks, status, sort_order
)
select
  d.id,
  r.title,
  r.notes,
  u.id,
  r.deadline,
  r.progress,
  r.updates,
  r.remarks,
  r.status,
  r.sort_order
from public.kf_rock_quarters q
join public.kf_rock_departments d
  on d.quarter_id = q.id
join (
  values
    (
      'Sales',
      'Publish the first 20 SKUs with a price',
      'Every live SKU has a cost, a sell price, and a photo.',
      'king@kingfamily.demo',
      '2026-11-15'::date,
      35,
      'Six sample SKUs are in the Products tab.',
      '',
      ''::text,
      0
    ),
    (
      'Operations',
      'Lock a monthly shipping number',
      'One courier rate we can type into the Shipping budget line.',
      'mira.king@kingfamily.demo',
      '2026-10-31'::date,
      20,
      'Asked two couriers for a small-parcel rate.',
      'Levi owns this once that login exists.',
      'attention',
      1
    ),
    (
      'Product',
      'Count stock and set reorder levels',
      'Low-stock flag matches the shelf.',
      'mira.king@kingfamily.demo',
      '2026-10-25'::date,
      50,
      'Navy cap is under its reorder level.',
      '',
      ''::text,
      2
    )
) as r(department, title, notes, owner_email, deadline, progress, updates, remarks, status, sort_order)
  on r.department = d.name
left join public.kf_users u on u.email = r.owner_email
where q.year = 2026
  and q.quarter = 4
  and not exists (
    select 1
    from public.kf_rocks existing
    where existing.department_id = d.id
      and existing.title = r.title
  );

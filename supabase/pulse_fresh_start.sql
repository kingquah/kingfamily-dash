-- Pulse shop budget: start fresh on 1 October 2026.
--
-- Run this once in the Supabase SQL editor after supabase/pulse_ecommerce.sql.
-- Safe to run again. It only touches kf_ tables and it does not delete rows.
--
-- The first run copies every current kf_budget_lines row into
-- kf_budget_line_archive, hides every line that is not one of the eight shop
-- lines (custom family lines included), and opens those eight lines for 2026
-- and 2027 at monthly_budget 0 with actuals {}. A later run keeps amounts
-- already entered on the shop lines. It still hides any non-shop line that
-- exists at that moment, including a custom line added after the first run.
--
-- The __fresh_start__ marker makes the mapping block in pulse_ecommerce.sql
-- return immediately, so a later run of that file cannot un-hide family lines
-- or roll archived amounts back onto the shop lines.

create table if not exists public.kf_budget_line_archive (
  id              uuid primary key default gen_random_uuid(),
  year            integer not null,
  line_key        text not null,
  monthly_budget  numeric,
  actuals         jsonb,
  label           text,
  section         text,
  hidden          boolean,
  is_custom       boolean,
  mapped_to       text,
  archived_at     timestamptz not null default now(),
  unique (year, line_key)
);

create table if not exists public.kf_budget_map_applied (
  year        integer not null,
  line_key    text not null,
  applied_at  timestamptz not null default now(),
  primary key (year, line_key)
);

alter table public.kf_budget_line_archive enable row level security;
alter table public.kf_budget_line_archive force row level security;
alter table public.kf_budget_map_applied enable row level security;
alter table public.kf_budget_map_applied force row level security;

do $fresh$
declare
  already boolean;
  shop_keys text[] := array[
    'revenue',
    'cogs',
    'labour',
    'shipping',
    'platform_fees',
    'marketing',
    'taxes',
    'miscellaneous'
  ];
begin
  select exists (
    select 1
    from public.kf_budget_map_applied
    where line_key = '__fresh_start__'
  ) into already;

  insert into public.kf_budget_line_archive (
    year, line_key, monthly_budget, actuals, label, section, hidden, is_custom, mapped_to
  )
  select
    b.year,
    b.line_key,
    b.monthly_budget,
    b.actuals,
    b.label,
    b.section,
    b.hidden,
    b.is_custom,
    null
  from public.kf_budget_lines b
  on conflict (year, line_key) do nothing;

  update public.kf_budget_lines
  set hidden = true
  where line_key <> all (shop_keys);

  if not already then
    insert into public.kf_budget_lines (
      year, line_key, monthly_budget, actuals, hidden, is_custom, label, section
    )
    select y.year, n.line_key, 0, '{}'::jsonb, false, false, n.label, n.section
    from (values (2026), (2027)) as y(year)
    cross join (
      values
        ('revenue'::text, 'Revenue'::text, 'Revenue'::text),
        ('cogs', 'Cost of Goods', 'Costs'),
        ('labour', 'Labour (Levi)', 'Costs'),
        ('shipping', 'Shipping', 'Costs'),
        ('platform_fees', 'Platform Fees', 'Costs'),
        ('marketing', 'Marketing', 'Costs'),
        ('taxes', 'Taxes', 'Costs'),
        ('miscellaneous', 'Miscellaneous', 'Costs')
    ) as n(line_key, label, section)
    on conflict (year, line_key) do update
    set
      monthly_budget = 0,
      actuals = '{}'::jsonb,
      hidden = false,
      is_custom = false,
      label = excluded.label,
      section = excluded.section;

    insert into public.kf_budget_map_applied (year, line_key)
    select years.year, shop.line_key
    from (
      select distinct year from public.kf_budget_lines
      union
      select distinct year from public.kf_budget_line_archive
      union
      select 2026
      union
      select 2027
    ) as years
    cross join unnest(shop_keys) as shop(line_key)
    on conflict (year, line_key) do nothing;

    insert into public.kf_budget_map_applied (year, line_key)
    values (0, '__fresh_start__')
    on conflict (year, line_key) do nothing;
  else
    insert into public.kf_budget_lines (
      year, line_key, monthly_budget, actuals, hidden, is_custom, label, section
    )
    select y.year, n.line_key, 0, '{}'::jsonb, false, false, n.label, n.section
    from (values (2026), (2027)) as y(year)
    cross join (
      values
        ('revenue'::text, 'Revenue'::text, 'Revenue'::text),
        ('cogs', 'Cost of Goods', 'Costs'),
        ('labour', 'Labour (Levi)', 'Costs'),
        ('shipping', 'Shipping', 'Costs'),
        ('platform_fees', 'Platform Fees', 'Costs'),
        ('marketing', 'Marketing', 'Costs'),
        ('taxes', 'Taxes', 'Costs'),
        ('miscellaneous', 'Miscellaneous', 'Costs')
    ) as n(line_key, label, section)
    on conflict (year, line_key) do nothing;

    update public.kf_budget_lines
    set hidden = false
    where year in (2026, 2027)
      and line_key = any (shop_keys);
  end if;
end
$fresh$;

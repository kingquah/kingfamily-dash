-- Pulse Dashboard — shop products, rocks, and budget lines.
-- Run this in the Supabase SQL editor AFTER schema.sql and
-- supabase/kingfamily_security.sql. Safe to run more than once.
--
-- Additive only. It does not drop tables, delete rows, or touch anything
-- that is not a kf_ object. Checklist tables are left as they are.
-- Old budget rows are copied into kf_budget_line_archive and hidden.
-- Their amounts are rolled into the new lines once. A later run will not
-- add those amounts again.
--
-- Do not re-run supabase/kingfamily_seed.sql. If you re-run
-- kingfamily_security.sql later, run this file again afterwards so the
-- extra budget read policy is put back. The amount rollup will not repeat.

-- ---------------------------------------------------------------------------
-- 1. Products
-- ---------------------------------------------------------------------------

create table if not exists public.kf_products (
  id             uuid primary key default gen_random_uuid(),
  sku            text not null unique,
  name           text not null,
  unit_cost      numeric not null default 0 check (unit_cost >= 0),
  sell_price     numeric not null default 0 check (sell_price >= 0),
  stock_on_hand  integer not null default 0 check (stock_on_hand >= 0),
  reorder_level  integer not null default 0 check (reorder_level >= 0),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.kf_product_sales (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.kf_products (id) on delete restrict,
  month       text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  units_sold  integer not null default 0 check (units_sold >= 0),
  revenue     numeric,
  entered_by  integer references public.kf_users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, month)
);

create index if not exists kf_product_sales_month_idx
  on public.kf_product_sales (month);

-- ---------------------------------------------------------------------------
-- 2. Rocks — quarterly goals, same shape as the Salty Squad board:
--    quarter header, department, owner, progress, status.
-- ---------------------------------------------------------------------------

create table if not exists public.kf_rock_quarters (
  id       uuid primary key default gen_random_uuid(),
  year     integer not null,
  quarter  integer not null check (quarter between 1 and 4),
  theme    text not null default '',
  bep      text not null default '',
  goal     text not null default '',
  rules    text not null default '',
  unique (year, quarter)
);

create table if not exists public.kf_rock_departments (
  id          uuid primary key default gen_random_uuid(),
  quarter_id  uuid not null references public.kf_rock_quarters (id) on delete cascade,
  name        text not null,
  sort_order  integer not null default 0,
  unique (quarter_id, name)
);

create table if not exists public.kf_rocks (
  id             uuid primary key default gen_random_uuid(),
  department_id  uuid not null references public.kf_rock_departments (id) on delete cascade,
  title          text not null,
  notes          text not null default '',
  owner_id       integer references public.kf_users (id) on delete set null,
  deadline       date,
  progress       integer not null default 0 check (progress between 0 and 100),
  updates        text not null default '',
  remarks        text not null default '',
  status         text not null default '' check (status = any (array[''::text, 'complete'::text, 'attention'::text, 'dropped'::text])),
  sort_order     integer not null default 0,
  archived       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists kf_rocks_department_idx
  on public.kf_rocks (department_id);

create table if not exists public.kf_rock_audit (
  id         uuid primary key default gen_random_uuid(),
  detail     text not null,
  user_id    integer,
  user_name  text,
  created_at timestamptz not null default now()
);

create index if not exists kf_rock_audit_created_idx
  on public.kf_rock_audit (created_at desc);

create table if not exists public.kf_rock_archive (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  department text,
  details    jsonb not null default '{}'::jsonb,
  user_id    integer,
  user_name  text,
  created_at timestamptz not null default now()
);

create index if not exists kf_rock_archive_created_idx
  on public.kf_rock_archive (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Budget history. Old lines are archived here, then hidden on
--    kf_budget_lines. kf_budget_map_applied remembers that a year/line was
--    already rolled forward.
-- ---------------------------------------------------------------------------

alter table public.kf_budget_lines add column if not exists hidden boolean not null default false;
alter table public.kf_budget_lines add column if not exists is_custom boolean not null default false;
alter table public.kf_budget_lines add column if not exists label text;
alter table public.kf_budget_lines add column if not exists section text;

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

-- Sum month maps such as {"Jan": 10, "Feb": 5}. Null and empty inputs become {}.
create or replace function public.kf_sum_money_actuals(parts jsonb[])
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_object_agg(month, total)
      from (
        select e.key as month, sum(e.value::numeric) as total
        from unnest(coalesce(parts, array[]::jsonb[])) as part
        cross join lateral jsonb_each_text(coalesce(part, '{}'::jsonb)) as e
        where e.value ~ '^-?[0-9]+(\.[0-9]+)?$'
        group by e.key
      ) summed
    ),
    '{}'::jsonb
  );
$$;

revoke all on function public.kf_sum_money_actuals(jsonb[]) from public, anon, authenticated;
grant execute on function public.kf_sum_money_actuals(jsonb[]) to service_role;

-- Staff may record units. A revenue override stays a manager field.
create or replace function public.kf_guard_product_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.kf_current_role() = 'staff' then
    if tg_op = 'INSERT' then
      new.revenue := null;
    else
      new.revenue := old.revenue;
      new.product_id := old.product_id;
      new.month := old.month;
    end if;
  end if;
  new.entered_by := coalesce(public.kf_current_user_id(), new.entered_by);
  new.updated_at := now();
  return new;
end;
$$;

-- Staff may update progress, updates, and status. Managers edit the goal.
create or replace function public.kf_guard_rock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if public.kf_is_manager() is true or public.kf_current_role() is null then
    new.updated_at := now();
    return new;
  end if;
  if tg_op = 'UPDATE' and public.kf_current_role() = 'staff' then
    if new.title is distinct from old.title
       or new.notes is distinct from old.notes
       or new.owner_id is distinct from old.owner_id
       or new.deadline is distinct from old.deadline
       or new.remarks is distinct from old.remarks
       or new.department_id is distinct from old.department_id
       or new.sort_order is distinct from old.sort_order
    then
      raise exception 'Only a manager can edit rock details';
    end if;
    new.updated_at := now();
    return new;
  end if;
  raise exception 'Only a manager can add a rock';
end;
$$;

revoke all on function public.kf_guard_product_sale() from public, anon, authenticated;
revoke all on function public.kf_guard_rock() from public, anon, authenticated;
grant execute on function public.kf_guard_product_sale() to service_role;
grant execute on function public.kf_guard_rock() to service_role;

drop trigger if exists kf_product_sale_guard on public.kf_product_sales;
create trigger kf_product_sale_guard
  before insert or update on public.kf_product_sales
  for each row execute function public.kf_guard_product_sale();

drop trigger if exists kf_rock_guard on public.kf_rocks;
create trigger kf_rock_guard
  before insert or update on public.kf_rocks
  for each row execute function public.kf_guard_rock();

drop trigger if exists kf_rock_audit_stamp on public.kf_rock_audit;
create trigger kf_rock_audit_stamp
  before insert on public.kf_rock_audit
  for each row execute function public.kf_stamp_audit();

drop trigger if exists kf_rock_archive_stamp on public.kf_rock_archive;
create trigger kf_rock_archive_stamp
  before insert on public.kf_rock_archive
  for each row execute function public.kf_stamp_audit();

-- ---------------------------------------------------------------------------
-- 4. Map the old chart of accounts onto the shop lines.
--    Revenue              total_sales
--    Cost of Goods        total_cogs
--    Labour (Levi)        payroll and statutory lines
--    Shipping             delivery
--    Platform Fees        stripe and subscriptions
--    Marketing            ads, materials, samples, sponsorships
--    Taxes                cp204 and the tax agent fee
--    Miscellaneous        every other standard cost line
--    Subtotal keys are left in place and are not added on top.
--    Custom lines stay on the sheet. A custom line in an old section is
--    moved under Costs so it still rolls into the total. The archive keeps
--    the section name it had.
--
--    supabase/pulse_fresh_start.sql supersedes this block on the live shop.
--    Once kf_budget_map_applied has line_key '__fresh_start__', the block
--    returns immediately and does not hide, un-hide, move, or roll any line.
-- ---------------------------------------------------------------------------

do $map$
declare
  pair record;
  target public.kf_budget_lines%rowtype;
  summed_budget numeric;
  summed_actuals jsonb;
  nonempty boolean;
  shop_keys text[] := array[
    'revenue', 'cogs', 'labour', 'shipping', 'platform_fees', 'marketing', 'taxes', 'miscellaneous'
  ];
begin
  if exists (
    select 1 from public.kf_budget_map_applied
    where line_key = '__fresh_start__'
  ) then
    return;
  end if;

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
    m.mapped_to
  from public.kf_budget_lines b
  join (
    values
      ('total_sales', 'revenue'),
      ('total_cogs', 'cogs'),
      ('payroll_my', 'labour'),
      ('payroll_sg', 'labour'),
      ('epf_cpf', 'labour'),
      ('socso', 'labour'),
      ('eis', 'labour'),
      ('sdl_sg', 'labour'),
      ('incentive', 'labour'),
      ('delivery', 'shipping'),
      ('stripe', 'platform_fees'),
      ('sub_google', 'platform_fees'),
      ('sub_chatgpt', 'platform_fees'),
      ('sub_octopus', 'platform_fees'),
      ('sub_canva', 'platform_fees'),
      ('sub_other', 'platform_fees'),
      ('sub_hosting', 'platform_fees'),
      ('sub_systeme', 'platform_fees'),
      ('sub_misc', 'platform_fees'),
      ('digital_mkt', 'marketing'),
      ('ads_spend', 'marketing'),
      ('mkt_materials', 'marketing'),
      ('samples', 'marketing'),
      ('sponsorships', 'marketing'),
      ('cp204', 'taxes'),
      ('tax_agent', 'taxes'),
      ('rental', 'miscellaneous'),
      ('sinking_fund', 'miscellaneous'),
      ('maintenance', 'miscellaneous'),
      ('company_trip', 'miscellaneous'),
      ('team_bonus', 'miscellaneous'),
      ('entertainment', 'miscellaneous'),
      ('fin_perfectaim', 'miscellaneous'),
      ('fin_sg', 'miscellaneous'),
      ('secretary', 'miscellaneous'),
      ('cosec_sg', 'miscellaneous'),
      ('filing', 'miscellaneous'),
      ('audit', 'miscellaneous'),
      ('tech_dev', 'miscellaneous'),
      ('cleaning', 'miscellaneous'),
      ('misc_prof', 'miscellaneous'),
      ('util_electric', 'miscellaneous'),
      ('util_water', 'miscellaneous'),
      ('util_internet', 'miscellaneous'),
      ('util_phone', 'miscellaneous'),
      ('off_stationery', 'miscellaneous'),
      ('off_pantry', 'miscellaneous'),
      ('off_it', 'miscellaneous'),
      ('off_furniture', 'miscellaneous'),
      ('veh_insurance', 'miscellaneous'),
      ('veh_service', 'miscellaneous'),
      ('depreciation', 'miscellaneous'),
      ('loan_proton', 'miscellaneous'),
      ('loan_denza', 'miscellaneous'),
      ('loan_maybank', 'miscellaneous')
  ) as m(line_key, mapped_to) on m.line_key = b.line_key
  on conflict (year, line_key) do nothing;

  update public.kf_budget_lines b
  set hidden = true
  from (
    values
      ('total_sales'),
      ('total_cogs'),
      ('payroll_my'),
      ('payroll_sg'),
      ('epf_cpf'),
      ('socso'),
      ('eis'),
      ('sdl_sg'),
      ('incentive'),
      ('delivery'),
      ('stripe'),
      ('sub_google'),
      ('sub_chatgpt'),
      ('sub_octopus'),
      ('sub_canva'),
      ('sub_other'),
      ('sub_hosting'),
      ('sub_systeme'),
      ('sub_misc'),
      ('digital_mkt'),
      ('ads_spend'),
      ('mkt_materials'),
      ('samples'),
      ('sponsorships'),
      ('cp204'),
      ('tax_agent'),
      ('rental'),
      ('sinking_fund'),
      ('maintenance'),
      ('company_trip'),
      ('team_bonus'),
      ('entertainment'),
      ('fin_perfectaim'),
      ('fin_sg'),
      ('secretary'),
      ('cosec_sg'),
      ('filing'),
      ('audit'),
      ('tech_dev'),
      ('cleaning'),
      ('misc_prof'),
      ('util_electric'),
      ('util_water'),
      ('util_internet'),
      ('util_phone'),
      ('off_stationery'),
      ('off_pantry'),
      ('off_it'),
      ('off_furniture'),
      ('veh_insurance'),
      ('veh_service'),
      ('depreciation'),
      ('loan_proton'),
      ('loan_denza'),
      ('loan_maybank')
  ) as old(line_key)
  where b.line_key = old.line_key
    and b.hidden = false;

  -- Keep hand-added lines on the sheet. Snapshot them once, then park any
  -- still-visible line under Costs so the total still includes it.
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
  where b.is_custom = true
    and b.line_key <> all (shop_keys)
  on conflict (year, line_key) do nothing;

  update public.kf_budget_lines
  set section = 'Costs'
  where is_custom = true
    and hidden = false
    and line_key <> all (shop_keys)
    and coalesce(section, '') not in ('Costs', 'Revenue');

  insert into public.kf_budget_lines (
    year, line_key, monthly_budget, actuals, hidden, is_custom, label, section
  )
  select y.year, n.line_key, 0, '{}'::jsonb, false, false, n.label, n.section
  from (
    select distinct year from public.kf_budget_lines
    union
    select (extract(year from current_date))::integer
  ) y
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

  update public.kf_budget_lines b
  set
    label = n.label,
    section = coalesce(b.section, n.section)
  from (
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
  where b.line_key = n.line_key
    and (b.label is null or b.label = '');

  for pair in
    select distinct year, mapped_to
    from public.kf_budget_line_archive
    where mapped_to is not null
  loop
    if exists (
      select 1 from public.kf_budget_map_applied
      where year = pair.year and line_key = pair.mapped_to
    ) then
      continue;
    end if;

    select * into target
    from public.kf_budget_lines
    where year = pair.year and line_key = pair.mapped_to;

    select
      coalesce(sum(monthly_budget), 0),
      public.kf_sum_money_actuals(array_agg(actuals))
    into summed_budget, summed_actuals
    from public.kf_budget_line_archive
    where year = pair.year and mapped_to = pair.mapped_to;

    select exists (
      select 1
      from jsonb_each_text(coalesce(target.actuals, '{}'::jsonb)) as e
      where e.value ~ '^-?[0-9]+(\.[0-9]+)?$'
        and e.value::numeric <> 0
    ) into nonempty;

    if target.id is not null
       and not coalesce(nonempty, false)
       and coalesce(target.monthly_budget, 0) = 0
    then
      update public.kf_budget_lines
      set
        monthly_budget = coalesce(summed_budget, 0),
        actuals = coalesce(summed_actuals, '{}'::jsonb)
      where id = target.id;
    end if;

    insert into public.kf_budget_map_applied (year, line_key)
    values (pair.year, pair.mapped_to)
    on conflict (year, line_key) do nothing;
  end loop;
end
$map$;

-- ---------------------------------------------------------------------------
-- 5. Row access. Staff read the shop. Managers edit products and rock
--    details. Anyone on the team can enter units and update rock progress.
--    Budget lines stay manager-write. The extra select policy lets the
--    dashboard show profit to staff without opening the Budget tab.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'kf_products',
    'kf_product_sales',
    'kf_rock_quarters',
    'kf_rock_departments',
    'kf_rocks',
    'kf_rock_audit',
    'kf_rock_archive',
    'kf_budget_line_archive',
    'kf_budget_map_applied'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

drop policy if exists kf_products_select on public.kf_products;
create policy kf_products_select on public.kf_products
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_products_insert on public.kf_products;
create policy kf_products_insert on public.kf_products
  for insert to authenticated
  with check (public.kf_is_manager());

drop policy if exists kf_products_update on public.kf_products;
create policy kf_products_update on public.kf_products
  for update to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

drop policy if exists kf_products_delete on public.kf_products;
create policy kf_products_delete on public.kf_products
  for delete to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_product_sales_select on public.kf_product_sales;
create policy kf_product_sales_select on public.kf_product_sales
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_product_sales_insert on public.kf_product_sales;
create policy kf_product_sales_insert on public.kf_product_sales
  for insert to authenticated
  with check (public.kf_current_role() is not null);

drop policy if exists kf_product_sales_update on public.kf_product_sales;
create policy kf_product_sales_update on public.kf_product_sales
  for update to authenticated
  using (public.kf_current_role() is not null)
  with check (public.kf_current_role() is not null);

drop policy if exists kf_product_sales_delete on public.kf_product_sales;
create policy kf_product_sales_delete on public.kf_product_sales
  for delete to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_rock_quarters_select on public.kf_rock_quarters;
create policy kf_rock_quarters_select on public.kf_rock_quarters
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_rock_quarters_insert on public.kf_rock_quarters;
create policy kf_rock_quarters_insert on public.kf_rock_quarters
  for insert to authenticated
  with check (public.kf_is_manager());

drop policy if exists kf_rock_quarters_update on public.kf_rock_quarters;
create policy kf_rock_quarters_update on public.kf_rock_quarters
  for update to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

drop policy if exists kf_rock_quarters_delete on public.kf_rock_quarters;
create policy kf_rock_quarters_delete on public.kf_rock_quarters
  for delete to authenticated
  using (public.kf_is_admin());

drop policy if exists kf_rock_departments_select on public.kf_rock_departments;
create policy kf_rock_departments_select on public.kf_rock_departments
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_rock_departments_insert on public.kf_rock_departments;
create policy kf_rock_departments_insert on public.kf_rock_departments
  for insert to authenticated
  with check (public.kf_is_manager());

drop policy if exists kf_rock_departments_update on public.kf_rock_departments;
create policy kf_rock_departments_update on public.kf_rock_departments
  for update to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

drop policy if exists kf_rock_departments_delete on public.kf_rock_departments;
create policy kf_rock_departments_delete on public.kf_rock_departments
  for delete to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_rocks_select on public.kf_rocks;
create policy kf_rocks_select on public.kf_rocks
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_rocks_insert on public.kf_rocks;
create policy kf_rocks_insert on public.kf_rocks
  for insert to authenticated
  with check (public.kf_is_manager());

drop policy if exists kf_rocks_update on public.kf_rocks;
create policy kf_rocks_update on public.kf_rocks
  for update to authenticated
  using (public.kf_current_role() is not null)
  with check (public.kf_current_role() is not null);

drop policy if exists kf_rocks_delete on public.kf_rocks;
create policy kf_rocks_delete on public.kf_rocks
  for delete to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_rock_audit_select on public.kf_rock_audit;
create policy kf_rock_audit_select on public.kf_rock_audit
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_rock_audit_insert on public.kf_rock_audit;
create policy kf_rock_audit_insert on public.kf_rock_audit
  for insert to authenticated
  with check (public.kf_current_role() is not null);

drop policy if exists kf_rock_audit_delete on public.kf_rock_audit;
create policy kf_rock_audit_delete on public.kf_rock_audit
  for delete to authenticated
  using (public.kf_is_admin());

drop policy if exists kf_rock_archive_select on public.kf_rock_archive;
create policy kf_rock_archive_select on public.kf_rock_archive
  for select to authenticated
  using (public.kf_current_role() is not null);

drop policy if exists kf_rock_archive_insert on public.kf_rock_archive;
create policy kf_rock_archive_insert on public.kf_rock_archive
  for insert to authenticated
  with check (public.kf_current_role() is not null);

drop policy if exists kf_rock_archive_delete on public.kf_rock_archive;
create policy kf_rock_archive_delete on public.kf_rock_archive
  for delete to authenticated
  using (public.kf_is_admin());

drop policy if exists kf_budget_archive_select on public.kf_budget_line_archive;
create policy kf_budget_archive_select on public.kf_budget_line_archive
  for select to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_budget_map_select on public.kf_budget_map_applied;
create policy kf_budget_map_select on public.kf_budget_map_applied
  for select to authenticated
  using (public.kf_is_manager());

drop policy if exists kf_budget_lines_read on public.kf_budget_lines;
create policy kf_budget_lines_read on public.kf_budget_lines
  for select to authenticated
  using (public.kf_current_role() is not null);

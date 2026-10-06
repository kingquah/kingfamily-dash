-- King Family Dash — idempotent schema
-- Apply this entire file in the Supabase SQL editor on the shared project.
--
-- It only creates kf_* tables, indexes, policies, grants, and sequences.
-- It does not alter, drop, or rewrite any existing object.
-- Safe to run more than once.

-- 1. USERS
create table if not exists public.kf_users (
  id          serial primary key,
  name        text not null,
  email       text not null unique,
  password    text not null,
  role        text not null check (role = any (array['admin'::text, 'supervisor'::text, 'staff'::text])),
  job_title   text,
  avatar      text,
  annual_left integer not null default 12
);

-- 2. LEAVE REQUESTS
create table if not exists public.kf_leave_requests (
  id        uuid primary key default gen_random_uuid(),
  user_id   integer references public.kf_users (id) on delete cascade,
  type      text not null default 'Annual',
  from_date date not null,
  to_date   date not null,
  days      integer not null,
  reason    text,
  status    text not null default 'Pending' check (status = any (array['Pending'::text, 'Approved'::text, 'Rejected'::text]))
);

-- 3. CHECKLIST SUBMISSIONS
-- director_score is written by the checklist page. Included here so scores persist.
create table if not exists public.kf_checklist_submissions (
  id             uuid primary key default gen_random_uuid(),
  user_id        integer references public.kf_users (id) on delete cascade,
  month_key      text not null,
  checks         jsonb not null default '{}'::jsonb,
  remarks        text not null default '',
  director_score integer,
  unique (user_id, month_key)
);

alter table public.kf_checklist_submissions
  add column if not exists director_score integer;

-- 4. SALES TARGETS
create table if not exists public.kf_sales_targets (
  id       serial primary key,
  month    text not null,
  year     integer not null default (extract(year from current_date))::integer,
  target   bigint not null default 500000,
  achieved bigint not null default 0,
  unique (month, year)
);

-- 5. SALES ENTRIES
create table if not exists public.kf_sales_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     integer references public.kf_users (id) on delete cascade,
  category    text not null check (category = any (array['sales_closed'::text, 'pipeline'::text, 'invoice'::text, 'quotation'::text])),
  client_name text not null,
  amount      numeric not null default 0,
  entry_date  date not null
);

create index if not exists kf_sales_entries_date_idx
  on public.kf_sales_entries (entry_date);

-- 6. BUDGET LINES
create table if not exists public.kf_budget_lines (
  id             uuid primary key default gen_random_uuid(),
  year           integer not null default (extract(year from current_date))::integer,
  line_key       text not null,
  monthly_budget numeric not null default 0,
  actuals        jsonb not null default '{}'::jsonb,
  hidden         boolean not null default false,
  is_custom      boolean not null default false,
  label          text,
  section        text,
  unique (year, line_key)
);

alter table public.kf_budget_lines add column if not exists hidden boolean not null default false;
alter table public.kf_budget_lines add column if not exists is_custom boolean not null default false;
alter table public.kf_budget_lines add column if not exists label text;
alter table public.kf_budget_lines add column if not exists section text;

-- 7. BUDGET MONTH STATUS
create table if not exists public.kf_budget_month_status (
  year    integer not null,
  month   text not null,
  checked boolean not null default false,
  unique (year, month)
);

-- 8. BUDGET LINE VISIBILITY
create table if not exists public.kf_budget_line_visibility (
  line_key      text primary key,
  staff_visible boolean not null default false
);

-- 9. BUDGET AUDIT
create table if not exists public.kf_budget_audit (
  id         uuid primary key default gen_random_uuid(),
  line_key   text not null,
  year       integer,
  month      text,
  field      text not null,
  old_value  text,
  new_value  text,
  user_id    integer,
  user_name  text,
  created_at timestamptz not null default now()
);

create index if not exists kf_budget_audit_created_idx
  on public.kf_budget_audit (created_at desc);

-- 10. KANBAN BOARD (single row, id = 1)
create table if not exists public.kf_kanban_board (
  id         integer primary key,
  data       jsonb not null default '{"columns": []}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 11. KANBAN AUDIT
create table if not exists public.kf_kanban_audit (
  id         uuid primary key default gen_random_uuid(),
  detail     text not null,
  user_id    integer,
  user_name  text,
  created_at timestamptz not null default now()
);

create index if not exists kf_kanban_audit_created_idx
  on public.kf_kanban_audit (created_at desc);

-- RLS, policies, and grants. Matches the live originals:
-- row level security on, full access for the anon and authenticated roles.
do $$
declare
  t text;
begin
  foreach t in array array[
    'kf_users',
    'kf_leave_requests',
    'kf_checklist_submissions',
    'kf_sales_targets',
    'kf_sales_entries',
    'kf_budget_lines',
    'kf_budget_month_status',
    'kf_budget_line_visibility',
    'kf_budget_audit',
    'kf_kanban_board',
    'kf_kanban_audit'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists anon_full_access on public.%I', t);
    execute format(
      'create policy anon_full_access on public.%I for all to anon, authenticated using (true) with check (true)',
      t
    );
    execute format(
      'grant all on table public.%I to anon, authenticated, service_role',
      t
    );
  end loop;
end $$;

grant usage, select, update on sequence public.kf_users_id_seq to anon, authenticated, service_role;
grant usage, select, update on sequence public.kf_sales_targets_id_seq to anon, authenticated, service_role;

-- Empty placeholders so the app can open before the demo seed.
-- supabase/kingfamily_seed.sql replaces the 2026 targets, the kanban board,
-- and adds the fictional King family logins. These inserts do not overwrite
-- rows the seed has already written.
insert into public.kf_kanban_board (id, data)
values (1, '{"columns": []}'::jsonb)
on conflict (id) do nothing;

insert into public.kf_sales_targets (month, year, target, achieved)
select m, (extract(year from current_date))::integer, 500000, 0
from unnest(array['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']) as m
on conflict (month, year) do nothing;

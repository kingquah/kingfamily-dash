-- King Family Dash — logins and row lock
-- Apply this whole file in the Supabase SQL editor AFTER schema.sql.
-- Safe to run more than once. It does not rewrite budget, sales, leave,
-- checklist, or kanban rows.
--
-- It only touches kf_* objects, plus auth.users and auth.identities so the
-- five existing people can sign in. It does not alter any other app's tables.
--
-- Every kf_users row that is not linked yet gets an Auth account with the
-- temporary password kingdemo. Already-linked accounts keep their password.
--
-- Deploy order: run this file, set the server secret, then deploy the app.

-- 1. Profile link and scoreboard fields. Existing rows stay as they are.
alter table public.kf_users add column if not exists auth_id uuid;
alter table public.kf_sales_entries add column if not exists channel text;
alter table public.kf_sales_entries add column if not exists country text;

create unique index if not exists kf_users_auth_id_key on public.kf_users (auth_id);

alter table public.kf_sales_entries drop constraint if exists kf_sales_entries_channel_check;
alter table public.kf_sales_entries add constraint kf_sales_entries_channel_check
  check (
    channel is null
    or channel = any (array[
      'Own store'::text,
      'Amazon'::text,
      'Shopee'::text,
      'Lazada'::text,
      'TikTok Shop'::text,
      'Other'::text
    ])
  );

-- 2. Who is signed in. Security definer so policies can read kf_users
-- without looping back into row level security.
create or replace function public.kf_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.kf_users where auth_id = auth.uid() limit 1
$$;

create or replace function public.kf_current_user_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select id from public.kf_users where auth_id = auth.uid() limit 1
$$;

create or replace function public.kf_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kf_current_role() = 'admin'
$$;

create or replace function public.kf_is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.kf_current_role() in ('admin', 'supervisor')
$$;

revoke all on function public.kf_current_role() from public, anon;
revoke all on function public.kf_current_user_id() from public, anon;
revoke all on function public.kf_is_admin() from public, anon;
revoke all on function public.kf_is_manager() from public, anon;
grant execute on function public.kf_current_role() to authenticated, service_role;
grant execute on function public.kf_current_user_id() to authenticated, service_role;
grant execute on function public.kf_is_admin() to authenticated, service_role;
grant execute on function public.kf_is_manager() to authenticated, service_role;

-- 3. Server-side guards. Audit names come from the signed-in profile.
-- Seed and service-role writes have no auth.uid(), so they keep the values they send.
create or replace function public.kf_stamp_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid integer;
  uname text;
begin
  if auth.uid() is not null then
    select id, name into uid, uname
    from public.kf_users
    where auth_id = auth.uid();
    new.user_id := uid;
    new.user_name := coalesce(uname, 'Unknown');
  end if;
  return new;
end;
$$;

create or replace function public.kf_keep_sales_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'update' then
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.kf_guard_checklist()
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
      new.user_id := public.kf_current_user_id();
      new.director_score := null;
    else
      new.user_id := old.user_id;
      new.director_score := old.director_score;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.kf_guard_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role = 'admin' and public.kf_current_role() is distinct from 'admin' then
    raise exception 'Only an admin can create or promote an admin';
  end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and public.kf_current_role() is distinct from 'admin' then
    raise exception 'Only an admin can change an admin';
  end if;
  return new;
end;
$$;

revoke all on function public.kf_stamp_audit() from public, anon, authenticated;
revoke all on function public.kf_keep_sales_owner() from public, anon, authenticated;
revoke all on function public.kf_guard_checklist() from public, anon, authenticated;
revoke all on function public.kf_guard_user_role() from public, anon, authenticated;
grant execute on function public.kf_stamp_audit() to service_role;
grant execute on function public.kf_keep_sales_owner() to service_role;
grant execute on function public.kf_guard_checklist() to service_role;
grant execute on function public.kf_guard_user_role() to service_role;

drop trigger if exists kf_budget_audit_stamp on public.kf_budget_audit;
create trigger kf_budget_audit_stamp
  before insert on public.kf_budget_audit
  for each row execute function public.kf_stamp_audit();

drop trigger if exists kf_kanban_audit_stamp on public.kf_kanban_audit;
create trigger kf_kanban_audit_stamp
  before insert on public.kf_kanban_audit
  for each row execute function public.kf_stamp_audit();

drop trigger if exists kf_sales_entries_keep_owner on public.kf_sales_entries;
create trigger kf_sales_entries_keep_owner
  before update on public.kf_sales_entries
  for each row execute function public.kf_keep_sales_owner();

drop trigger if exists kf_checklist_guard on public.kf_checklist_submissions;
create trigger kf_checklist_guard
  before insert or update on public.kf_checklist_submissions
  for each row execute function public.kf_guard_checklist();

drop trigger if exists kf_users_guard_role on public.kf_users;
create trigger kf_users_guard_role
  before insert or update on public.kf_users
  for each row execute function public.kf_guard_user_role();

-- 4. Auth accounts for people who are not linked yet.
-- Temporary password for a newly created account: kingdemo
do $link$
declare
  person record;
  existing uuid;
  new_id uuid;
  crypt_expr text;
  token_cols text := '';
  token_vals text := '';
  col text;
begin
  if to_regprocedure('extensions.crypt(text,text)') is not null then
    crypt_expr := 'extensions.crypt(%L, extensions.gen_salt(%L))';
  elsif to_regprocedure('public.crypt(text,text)') is not null then
    crypt_expr := 'public.crypt(%L, public.gen_salt(%L))';
  else
    raise exception 'pgcrypto crypt() was not found in extensions or public';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
  ) then
    raise exception 'auth.identities.provider_id is missing; this Supabase Auth version is too old to link by SQL';
  end if;

  foreach col in array array[
    'confirmation_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'recovery_token',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = col
    ) then
      token_cols := token_cols || ', ' || quote_ident(col);
      token_vals := token_vals || ', ' || quote_literal('');
    end if;
  end loop;

  for person in
    select id, email, name
    from public.kf_users
    where auth_id is null
    order by id
  loop
    select u.id into existing
    from auth.users u
    where lower(u.email) = lower(person.email)
    limit 1;

    if existing is null then
      new_id := gen_random_uuid();
      execute format(
        'insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at%s) values (%L, %L, %L, %L, %L, %s, now(), %L::jsonb, %L::jsonb, now(), now()%s)',
        token_cols,
        '00000000-0000-0000-0000-000000000000',
        new_id,
        'authenticated',
        'authenticated',
        person.email,
        format(crypt_expr, 'kingdemo', 'bf'),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('name', person.name)::text,
        token_vals
      );
      existing := new_id;
    else
      update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, now())
      where id = existing;
    end if;

    begin
      insert into auth.identities (
        id, user_id, provider, provider_id, identity_data, created_at, updated_at
      ) values (
        gen_random_uuid(),
        existing,
        'email',
        existing::text,
        jsonb_build_object(
          'sub', existing::text,
          'email', person.email,
          'email_verified', true
        ),
        now(),
        now()
      );
    exception when unique_violation then
      null;
    end;

    update public.kf_users
    set auth_id = existing
    where id = person.id
      and auth_id is null;
  end loop;
end
$link$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kf_users_auth_id_fkey'
  ) then
    alter table public.kf_users
      add constraint kf_users_auth_id_fkey
      foreign key (auth_id) references auth.users (id) on delete set null;
  end if;
end $$;

alter table public.kf_users drop column if exists password;

-- 5. Close the public key. Drop every existing kf_ policy, including anon_full_access.
do $$
declare
  t text;
  pol record;
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
    execute format('alter table public.%I force row level security', t);
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', pol.policyname, t);
    end loop;
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

revoke all on sequence public.kf_users_id_seq from public, anon;
revoke all on sequence public.kf_sales_targets_id_seq from public, anon;
grant usage, select on sequence public.kf_users_id_seq to authenticated, service_role;
grant usage, select on sequence public.kf_sales_targets_id_seq to authenticated, service_role;

-- 6. Role policies. Permissive policies combine with OR.
-- Staff read the team list (names on the scoreboard) but cannot change accounts.

create policy kf_users_select on public.kf_users
  for select to authenticated
  using (public.kf_current_role() is not null);

create policy kf_users_insert on public.kf_users
  for insert to authenticated
  with check (public.kf_is_admin());

create policy kf_users_update on public.kf_users
  for update to authenticated
  using (public.kf_is_admin())
  with check (public.kf_is_admin());

create policy kf_users_delete on public.kf_users
  for delete to authenticated
  using (public.kf_is_admin());

create policy kf_leave_select on public.kf_leave_requests
  for select to authenticated
  using (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_leave_insert on public.kf_leave_requests
  for insert to authenticated
  with check (
    public.kf_is_manager()
    or (user_id = public.kf_current_user_id() and status = 'Pending')
  );

create policy kf_leave_update on public.kf_leave_requests
  for update to authenticated
  using (
    public.kf_is_manager()
    or (user_id = public.kf_current_user_id() and status = 'Pending')
  )
  with check (
    public.kf_is_manager()
    or (user_id = public.kf_current_user_id() and status = 'Pending')
  );

create policy kf_leave_delete on public.kf_leave_requests
  for delete to authenticated
  using (
    public.kf_is_manager()
    or (user_id = public.kf_current_user_id() and status = 'Pending')
  );

create policy kf_checklist_select on public.kf_checklist_submissions
  for select to authenticated
  using (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_checklist_insert on public.kf_checklist_submissions
  for insert to authenticated
  with check (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_checklist_update on public.kf_checklist_submissions
  for update to authenticated
  using (user_id = public.kf_current_user_id() or public.kf_is_manager())
  with check (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_checklist_delete on public.kf_checklist_submissions
  for delete to authenticated
  using (public.kf_is_manager());

create policy kf_sales_targets_select on public.kf_sales_targets
  for select to authenticated
  using (public.kf_current_role() is not null);

create policy kf_sales_targets_write on public.kf_sales_targets
  for insert to authenticated
  with check (public.kf_is_manager());

create policy kf_sales_targets_update on public.kf_sales_targets
  for update to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

create policy kf_sales_targets_delete on public.kf_sales_targets
  for delete to authenticated
  using (public.kf_is_manager());

create policy kf_sales_entries_select on public.kf_sales_entries
  for select to authenticated
  using (public.kf_current_role() is not null);

create policy kf_sales_entries_insert on public.kf_sales_entries
  for insert to authenticated
  with check (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_sales_entries_update on public.kf_sales_entries
  for update to authenticated
  using (user_id = public.kf_current_user_id() or public.kf_is_manager())
  with check (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_sales_entries_delete on public.kf_sales_entries
  for delete to authenticated
  using (user_id = public.kf_current_user_id() or public.kf_is_manager());

create policy kf_budget_lines_all on public.kf_budget_lines
  for all to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

create policy kf_budget_month_status_all on public.kf_budget_month_status
  for all to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

create policy kf_budget_line_visibility_all on public.kf_budget_line_visibility
  for all to authenticated
  using (public.kf_is_manager())
  with check (public.kf_is_manager());

create policy kf_budget_audit_select on public.kf_budget_audit
  for select to authenticated
  using (public.kf_is_manager());

create policy kf_budget_audit_insert on public.kf_budget_audit
  for insert to authenticated
  with check (public.kf_is_manager());

create policy kf_budget_audit_delete on public.kf_budget_audit
  for delete to authenticated
  using (public.kf_is_admin());

create policy kf_kanban_board_select on public.kf_kanban_board
  for select to authenticated
  using (public.kf_current_role() is not null);

create policy kf_kanban_board_insert on public.kf_kanban_board
  for insert to authenticated
  with check (public.kf_current_role() is not null);

create policy kf_kanban_board_update on public.kf_kanban_board
  for update to authenticated
  using (public.kf_current_role() is not null)
  with check (public.kf_current_role() is not null);

create policy kf_kanban_board_delete on public.kf_kanban_board
  for delete to authenticated
  using (public.kf_is_admin());

create policy kf_kanban_audit_select on public.kf_kanban_audit
  for select to authenticated
  using (public.kf_current_role() is not null);

create policy kf_kanban_audit_insert on public.kf_kanban_audit
  for insert to authenticated
  with check (public.kf_current_role() is not null);

create policy kf_kanban_audit_delete on public.kf_kanban_audit
  for delete to authenticated
  using (public.kf_is_admin());

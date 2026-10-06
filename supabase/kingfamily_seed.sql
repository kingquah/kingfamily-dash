-- King Family Dash — fictional demo seed
-- Case-study data only. Invented names, clients, and figures.
-- Run AFTER schema.sql, in the Supabase SQL editor.
-- Inserts and updates kf_* tables only. Safe to re-run.
--
-- Demo password for every account (stored in plain text, which is
-- how this dashboard checks logins): kingdemo
--
--   adrian.king@kingfamily.demo   admin        Founder
--   mira.king@kingfamily.demo     supervisor   Household director
--   leo.king@kingfamily.demo      staff        Studio lead
--   sable.king@kingfamily.demo    staff        Client partner
--   nora.king@kingfamily.demo     staff        Bookkeeper
--
-- Budget tab card "Net Profit (Actual YTD)" for 2026 should read
-- RM 1,186,400.
-- That card sums every month of: closed-sales income (sales_entries
-- where category = sales_closed) minus COGS, operating expenses,
-- depreciation, loans, and CP204. November and December actuals are 0,
-- so the full-year total is the position through October 2026.
-- EXPECTED_NET_PROFIT_ACTUAL_YTD: 1186400

begin;

insert into public.kf_users (name, email, password, role, job_title, avatar, annual_left) values
  ('Adrian King', 'adrian.king@kingfamily.demo', 'kingdemo', 'admin', 'Founder', 'AK', 8),
  ('Mira King', 'mira.king@kingfamily.demo', 'kingdemo', 'supervisor', 'Household Director', 'MK', 9),
  ('Leo King', 'leo.king@kingfamily.demo', 'kingdemo', 'staff', 'Studio Lead', 'LK', 10),
  ('Sable King', 'sable.king@kingfamily.demo', 'kingdemo', 'staff', 'Client Partner', 'SK', 7),
  ('Nora King', 'nora.king@kingfamily.demo', 'kingdemo', 'staff', 'Bookkeeper', 'NK', 12)
on conflict (email) do update set
  name = excluded.name,
  password = excluded.password,
  role = excluded.role,
  job_title = excluded.job_title,
  avatar = excluded.avatar,
  annual_left = excluded.annual_left;

select setval(
  'public.kf_users_id_seq',
  greatest((select max(id) from public.kf_users), 1)
);

insert into public.kf_leave_requests (id, user_id, type, from_date, to_date, days, reason, status)
select v.id, u.id, v.type, v.from_date, v.to_date, v.days, v.reason, v.status
from (values
  ('a1111111-1111-4111-8111-000000000001'::uuid, 'adrian.king@kingfamily.demo', 'Annual', '2026-08-11'::date, '2026-08-14'::date, 4, 'Coast trip with the cousins', 'Approved'),
  ('a1111111-1111-4111-8111-000000000002'::uuid, 'mira.king@kingfamily.demo', 'Annual', '2026-02-16'::date, '2026-02-18'::date, 3, 'Family long weekend', 'Approved'),
  ('a1111111-1111-4111-8111-000000000003'::uuid, 'leo.king@kingfamily.demo', 'Annual', '2026-01-12'::date, '2026-01-13'::date, 2, 'Moving day', 'Approved'),
  ('a1111111-1111-4111-8111-000000000004'::uuid, 'leo.king@kingfamily.demo', 'Sick', '2026-10-02'::date, '2026-10-03'::date, 2, 'Flu — working from the spare room', 'Pending'),
  ('a1111111-1111-4111-8111-000000000005'::uuid, 'sable.king@kingfamily.demo', 'Annual', '2026-07-20'::date, '2026-07-24'::date, 5, 'Summer break', 'Approved'),
  ('a1111111-1111-4111-8111-000000000006'::uuid, 'nora.king@kingfamily.demo', 'Unpaid', '2026-04-02'::date, '2026-04-03'::date, 2, 'Personal errand', 'Rejected'),
  ('a1111111-1111-4111-8111-000000000007'::uuid, 'mira.king@kingfamily.demo', 'Sick', '2026-09-09'::date, '2026-09-09'::date, 1, 'Migraine', 'Approved')
) as v(id, email, type, from_date, to_date, days, reason, status)
join public.kf_users u on u.email = v.email
on conflict (id) do update set
  user_id = excluded.user_id,
  type = excluded.type,
  from_date = excluded.from_date,
  to_date = excluded.to_date,
  days = excluded.days,
  reason = excluded.reason,
  status = excluded.status;

insert into public.kf_checklist_submissions (id, user_id, month_key, checks, remarks, director_score)
select v.id, u.id, v.month_key, v.checks, v.remarks, v.director_score
from (values
  ('b2222222-2222-4222-8222-000000000001'::uuid, 'adrian.king@kingfamily.demo', '2026-08', '{"r1":true,"r2":true,"r3":false,"p1":true,"p2":true,"p3":true,"p4":true,"p5":true,"w1":true,"w2":false,"w3":true,"wi1":true,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":false,"pm4":true}'::jsonb, 'Quiet month. Portrait brief slipped a day.', 3),
  ('b2222222-2222-4222-8222-000000000002'::uuid, 'adrian.king@kingfamily.demo', '2026-09', '{"r1":true,"r2":true,"r3":false,"p1":true,"p2":true,"p3":true,"p4":true,"p5":true,"w1":true,"w2":false,"w3":true,"wi1":true,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":false,"pm4":true}'::jsonb, 'Caught up. Client reviews were on time.', 9),
  ('b2222222-2222-4222-8222-000000000003'::uuid, 'mira.king@kingfamily.demo', '2026-09', '{"r1":true,"r2":true,"r3":true,"p1":true,"p2":false,"p3":true,"p4":true,"p5":true,"w1":true,"w2":true,"w3":true,"wi1":false,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":true,"pm4":true}'::jsonb, 'Household calendar and studio handoff both held.', 8),
  ('b2222222-2222-4222-8222-000000000004'::uuid, 'mira.king@kingfamily.demo', '2026-10', '{"r1":true,"r2":true,"r3":true,"p1":true,"p2":true,"p3":true,"p4":false,"p5":true,"w1":true,"w2":true,"w3":true,"wi1":true,"wi2":true,"wi3":false,"pm1":true,"pm2":true,"pm3":true,"pm4":true}'::jsonb, 'October is still open. Two calls ran long.', 7),
  ('b2222222-2222-4222-8222-000000000005'::uuid, 'leo.king@kingfamily.demo', '2026-09', '{"r1":true,"r2":false,"r3":true,"p1":true,"p2":true,"p3":true,"p4":true,"p5":true,"w1":false,"w2":true,"w3":true,"wi1":true,"wi2":true,"wi3":true,"pm1":true,"pm2":false,"pm3":true,"pm4":true}'::jsonb, 'Delivery days were clean. One late pre-read.', 8),
  ('b2222222-2222-4222-8222-000000000006'::uuid, 'leo.king@kingfamily.demo', '2026-10', '{"r1":true,"r2":true,"r3":true,"p1":false,"p2":true,"p3":true,"p4":true,"p5":true,"w1":true,"w2":true,"w3":false,"wi1":true,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":true,"pm4":false}'::jsonb, 'Out sick early in the month.', 6),
  ('b2222222-2222-4222-8222-000000000007'::uuid, 'sable.king@kingfamily.demo', '2026-09', '{"r1":true,"r2":true,"r3":true,"p1":true,"p2":true,"p3":false,"p4":true,"p5":true,"w1":true,"w2":true,"w3":true,"wi1":true,"wi2":false,"wi3":true,"pm1":true,"pm2":true,"pm3":true,"pm4":true}'::jsonb, 'Closed Hartwell and Northglass without a chase.', 9),
  ('b2222222-2222-4222-8222-000000000008'::uuid, 'sable.king@kingfamily.demo', '2026-10', '{"r1":false,"r2":true,"r3":true,"p1":true,"p2":true,"p3":true,"p4":true,"p5":false,"w1":true,"w2":true,"w3":true,"wi1":true,"wi2":true,"wi3":true,"pm1":false,"pm2":true,"pm3":true,"pm4":true}'::jsonb, 'Pipeline is warm. Quotes went out before Friday.', 8),
  ('b2222222-2222-4222-8222-000000000009'::uuid, 'nora.king@kingfamily.demo', '2026-09', '{"r1":true,"r2":true,"r3":false,"p1":true,"p2":true,"p3":true,"p4":true,"p5":true,"w1":true,"w2":false,"w3":true,"wi1":true,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":false,"pm4":true}'::jsonb, 'September books closed on the 4th.', 9),
  ('b2222222-2222-4222-8222-000000000010'::uuid, 'nora.king@kingfamily.demo', '2026-10', '{"r1":true,"r2":true,"r3":true,"p1":true,"p2":false,"p3":true,"p4":true,"p5":true,"w1":true,"w2":true,"w3":true,"wi1":false,"wi2":true,"wi3":true,"pm1":true,"pm2":true,"pm3":true,"pm4":true}'::jsonb, 'October actuals posted through the 3rd.', 7)
) as v(id, email, month_key, checks, remarks, director_score)
join public.kf_users u on u.email = v.email
on conflict (id) do update set
  user_id = excluded.user_id,
  month_key = excluded.month_key,
  checks = excluded.checks,
  remarks = excluded.remarks,
  director_score = excluded.director_score;

insert into public.kf_sales_targets (month, year, target, achieved) values
  ('Jan', 2026, 175511, 183511),
  ('Feb', 2026, 209275, 197275),
  ('Mar', 2026, 200744, 208744),
  ('Apr', 2026, 232214, 220214),
  ('May', 2026, 225977, 233977),
  ('Jun', 2026, 227626, 215626),
  ('Jul', 2026, 239740, 247740),
  ('Aug', 2026, 250565, 238565),
  ('Sep', 2026, 248916, 256916),
  ('Oct', 2026, 281092, 266092),
  ('Nov', 2026, 250000, 0),
  ('Dec', 2026, 250000, 0)
on conflict (month, year) do update set
  target = excluded.target,
  achieved = excluded.achieved;

insert into public.kf_sales_entries (id, user_id, category, client_name, amount, entry_date)
select v.id, u.id, v.category, v.client_name, v.amount, v.entry_date
from (values
  ('c3333333-3333-4333-8333-000000000100'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Hartwell & Co', 61170::numeric, '2026-01-12'::date),
  ('c3333333-3333-4333-8333-000000000101'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Northglass Studio', 61170::numeric, '2026-01-18'::date),
  ('c3333333-3333-4333-8333-000000000102'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Pinenook Goods', 61171::numeric, '2026-01-24'::date),
  ('c3333333-3333-4333-8333-000000000103'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Lumen & Birch', 98637::numeric, '2026-02-12'::date),
  ('c3333333-3333-4333-8333-000000000104'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Oaklane Hospitality', 98638::numeric, '2026-02-18'::date),
  ('c3333333-3333-4333-8333-000000000105'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Marlowe Press', 69581::numeric, '2026-03-12'::date),
  ('c3333333-3333-4333-8333-000000000106'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Vesper Clinic', 69581::numeric, '2026-03-18'::date),
  ('c3333333-3333-4333-8333-000000000107'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Fieldnote Apparel', 69582::numeric, '2026-03-24'::date),
  ('c3333333-3333-4333-8333-000000000108'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Cinder & Co', 73404::numeric, '2026-04-12'::date),
  ('c3333333-3333-4333-8333-000000000109'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Brightwharf School', 73404::numeric, '2026-04-18'::date),
  ('c3333333-3333-4333-8333-000000000110'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Hartwell & Co', 73406::numeric, '2026-04-24'::date),
  ('c3333333-3333-4333-8333-000000000111'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Northglass Studio', 116988::numeric, '2026-05-12'::date),
  ('c3333333-3333-4333-8333-000000000112'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Pinenook Goods', 116989::numeric, '2026-05-18'::date),
  ('c3333333-3333-4333-8333-000000000113'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Lumen & Birch', 71875::numeric, '2026-06-12'::date),
  ('c3333333-3333-4333-8333-000000000114'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Oaklane Hospitality', 71875::numeric, '2026-06-18'::date),
  ('c3333333-3333-4333-8333-000000000115'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Marlowe Press', 71876::numeric, '2026-06-24'::date),
  ('c3333333-3333-4333-8333-000000000116'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Vesper Clinic', 123870::numeric, '2026-07-12'::date),
  ('c3333333-3333-4333-8333-000000000117'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Fieldnote Apparel', 123870::numeric, '2026-07-18'::date),
  ('c3333333-3333-4333-8333-000000000118'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Cinder & Co', 79521::numeric, '2026-08-12'::date),
  ('c3333333-3333-4333-8333-000000000119'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Brightwharf School', 79521::numeric, '2026-08-18'::date),
  ('c3333333-3333-4333-8333-000000000120'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Northglass Studio', 79523::numeric, '2026-08-24'::date),
  ('c3333333-3333-4333-8333-000000000121'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Pinenook Goods', 85638::numeric, '2026-09-12'::date),
  ('c3333333-3333-4333-8333-000000000122'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Hartwell & Co', 85638::numeric, '2026-09-18'::date),
  ('c3333333-3333-4333-8333-000000000123'::uuid, 'adrian.king@kingfamily.demo', 'sales_closed', 'Lumen & Birch', 85640::numeric, '2026-09-24'::date),
  ('c3333333-3333-4333-8333-000000000124'::uuid, 'sable.king@kingfamily.demo', 'sales_closed', 'Oaklane Hospitality', 133046::numeric, '2026-10-02'::date),
  ('c3333333-3333-4333-8333-000000000125'::uuid, 'leo.king@kingfamily.demo', 'sales_closed', 'Marlowe Press', 133046::numeric, '2026-10-03'::date),
  ('c3333333-3333-4333-8333-000000000001'::uuid, 'sable.king@kingfamily.demo', 'pipeline', 'Hartwell & Co — winter catalogue', 64000::numeric, '2026-10-02'::date),
  ('c3333333-3333-4333-8333-000000000002'::uuid, 'leo.king@kingfamily.demo', 'pipeline', 'Brightwharf School — spring fair', 28000::numeric, '2026-10-03'::date),
  ('c3333333-3333-4333-8333-000000000003'::uuid, 'sable.king@kingfamily.demo', 'invoice', 'Lumen & Birch — September retainer', 18500::numeric, '2026-10-02'::date),
  ('c3333333-3333-4333-8333-000000000004'::uuid, 'adrian.king@kingfamily.demo', 'quotation', 'Oaklane Hospitality — lobby refresh', 96000::numeric, '2026-10-05'::date),
  ('c3333333-3333-4333-8333-000000000005'::uuid, 'sable.king@kingfamily.demo', 'quotation', 'Fieldnote Apparel — lookbook', 41000::numeric, '2026-09-16'::date),
  ('c3333333-3333-4333-8333-000000000006'::uuid, 'leo.king@kingfamily.demo', 'invoice', 'Vesper Clinic — wayfinding set', 22300::numeric, '2026-08-19'::date),
  ('c3333333-3333-4333-8333-000000000007'::uuid, 'mira.king@kingfamily.demo', 'pipeline', 'Pinenook Goods — gift edit', 17500::numeric, '2026-07-14'::date),
  ('c3333333-3333-4333-8333-000000000008'::uuid, 'nora.king@kingfamily.demo', 'invoice', 'Cinder & Co — packaging rerun', 9800::numeric, '2026-06-11'::date)
) as v(id, email, category, client_name, amount, entry_date)
join public.kf_users u on u.email = v.email
on conflict (id) do update set
  user_id = excluded.user_id,
  category = excluded.category,
  client_name = excluded.client_name,
  amount = excluded.amount,
  entry_date = excluded.entry_date;

insert into public.kf_budget_lines (year, line_key, monthly_budget, actuals, hidden, is_custom, label, section) values
  (2026, 'total_sales', 250000, '{"Jan":183511,"Feb":197275,"Mar":208744,"Apr":220214,"May":233977,"Jun":215626,"Jul":247740,"Aug":238565,"Sep":256916,"Oct":266092,"Nov":0,"Dec":0}'::jsonb, false, false, 'Total Sales', 'Revenue (Goal)'),
  (2026, 'total_cogs', 52000, '{"Jan":42000,"Feb":45500,"Mar":48200,"Apr":51000,"May":53800,"Jun":49600,"Jul":57200,"Aug":55400,"Sep":59800,"Oct":61500,"Nov":0,"Dec":0}'::jsonb, false, false, 'Total COGS', 'COGS'),
  (2026, 'payroll_my', 9200, '{"Jan":9200,"Feb":9200,"Mar":9200,"Apr":9200,"May":9200,"Jun":9200,"Jul":9200,"Aug":9200,"Sep":9200,"Oct":9200,"Nov":0,"Dec":0}'::jsonb, false, false, 'Payroll (Malaysia)', 'Salaries'),
  (2026, 'payroll_sg', 4800, '{"Jan":4800,"Feb":4800,"Mar":4800,"Apr":4800,"May":4800,"Jun":4800,"Jul":4800,"Aug":4800,"Sep":4800,"Oct":4800,"Nov":0,"Dec":0}'::jsonb, false, false, 'Payroll (second office)', 'Salaries'),
  (2026, 'epf_cpf', 1450, '{"Jan":1450,"Feb":1450,"Mar":1450,"Apr":1450,"May":1450,"Jun":1450,"Jul":1450,"Aug":1450,"Sep":1450,"Oct":1450,"Nov":0,"Dec":0}'::jsonb, false, false, 'EPF/CPF (yer)', 'Salaries'),
  (2026, 'socso', 220, '{"Jan":220,"Feb":220,"Mar":220,"Apr":220,"May":220,"Jun":220,"Jul":220,"Aug":220,"Sep":220,"Oct":220,"Nov":0,"Dec":0}'::jsonb, false, false, 'Socso (yer)', 'Salaries'),
  (2026, 'eis', 48, '{"Jan":48,"Feb":48,"Mar":48,"Apr":48,"May":48,"Jun":48,"Jul":48,"Aug":48,"Sep":48,"Oct":48,"Nov":0,"Dec":0}'::jsonb, false, false, 'EIS (yer)', 'Salaries'),
  (2026, 'sdl_sg', 110, '{"Jan":110,"Feb":110,"Mar":110,"Apr":110,"May":110,"Jun":110,"Jul":110,"Aug":110,"Sep":110,"Oct":110,"Nov":0,"Dec":0}'::jsonb, false, false, 'SDL (second office)', 'Salaries'),
  (2026, 'incentive', 1000, '{"Jan":0,"Feb":0,"Mar":0,"Apr":0,"May":0,"Jun":6500,"Jul":0,"Aug":0,"Sep":0,"Oct":4000,"Nov":0,"Dec":0}'::jsonb, false, false, 'INCENTIVE', 'Salaries'),
  (2026, 'rental', 3600, '{"Jan":3600,"Feb":3600,"Mar":3600,"Apr":3600,"May":3600,"Jun":3600,"Jul":3600,"Aug":3600,"Sep":3600,"Oct":3600,"Nov":0,"Dec":0}'::jsonb, false, false, 'Rental Expenses', 'Fixed'),
  (2026, 'sinking_fund', 400, '{"Jan":400,"Feb":400,"Mar":400,"Apr":400,"May":400,"Jun":400,"Jul":400,"Aug":400,"Sep":400,"Oct":400,"Nov":0,"Dec":0}'::jsonb, false, false, 'Sinking Fund', 'Fixed'),
  (2026, 'maintenance', 280, '{"Jan":280,"Feb":280,"Mar":280,"Apr":280,"May":280,"Jun":280,"Jul":280,"Aug":280,"Sep":280,"Oct":280,"Nov":0,"Dec":0}'::jsonb, false, false, 'Maintenance Service Charge', 'Fixed'),
  (2026, 'delivery', 900, '{"Jan":950,"Feb":950,"Mar":950,"Apr":950,"May":950,"Jun":950,"Jul":950,"Aug":950,"Sep":950,"Oct":950,"Nov":0,"Dec":0}'::jsonb, false, false, 'Delivery/Transport Charges (Grab + courier)', 'Fixed'),
  (2026, 'samples', 500, '{"Jan":600,"Feb":600,"Mar":600,"Apr":600,"May":600,"Jun":600,"Jul":600,"Aug":600,"Sep":600,"Oct":600,"Nov":0,"Dec":0}'::jsonb, false, false, 'Samples Purchase', 'Fixed'),
  (2026, 'company_trip', 700, '{"Jan":0,"Feb":0,"Mar":0,"Apr":0,"May":0,"Jun":0,"Jul":0,"Aug":8500,"Sep":0,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Company Trip, Overseas Trip, Culture', 'Fixed'),
  (2026, 'sponsorships', 400, '{"Jan":500,"Feb":500,"Mar":500,"Apr":500,"May":500,"Jun":500,"Jul":500,"Aug":500,"Sep":500,"Oct":500,"Nov":0,"Dec":0}'::jsonb, false, false, 'Sponsorships & Others', 'Fixed'),
  (2026, 'team_bonus', 800, '{"Jan":0,"Feb":0,"Mar":7500,"Apr":0,"May":0,"Jun":0,"Jul":0,"Aug":0,"Sep":0,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Team Bonus', 'Fixed'),
  (2026, 'entertainment', 700, '{"Jan":750,"Feb":750,"Mar":750,"Apr":750,"May":750,"Jun":750,"Jul":750,"Aug":750,"Sep":750,"Oct":750,"Nov":0,"Dec":0}'::jsonb, false, false, 'Entertainment', 'Fixed'),
  (2026, 'util_electric', 400, '{"Jan":420,"Feb":420,"Mar":420,"Apr":420,"May":420,"Jun":420,"Jul":420,"Aug":420,"Sep":420,"Oct":420,"Nov":0,"Dec":0}'::jsonb, false, false, 'Electricity', 'Utilities'),
  (2026, 'util_water', 50, '{"Jan":55,"Feb":55,"Mar":55,"Apr":55,"May":55,"Jun":55,"Jul":55,"Aug":55,"Sep":55,"Oct":55,"Nov":0,"Dec":0}'::jsonb, false, false, 'Water', 'Utilities'),
  (2026, 'util_internet', 199, '{"Jan":199,"Feb":199,"Mar":199,"Apr":199,"May":199,"Jun":199,"Jul":199,"Aug":199,"Sep":199,"Oct":199,"Nov":0,"Dec":0}'::jsonb, false, false, 'Internet', 'Utilities'),
  (2026, 'util_phone', 180, '{"Jan":180,"Feb":180,"Mar":180,"Apr":180,"May":180,"Jun":180,"Jul":180,"Aug":180,"Sep":180,"Oct":180,"Nov":0,"Dec":0}'::jsonb, false, false, 'Household phone bill', 'Utilities'),
  (2026, 'off_stationery', 120, '{"Jan":140,"Feb":140,"Mar":140,"Apr":140,"May":140,"Jun":140,"Jul":140,"Aug":140,"Sep":140,"Oct":140,"Nov":0,"Dec":0}'::jsonb, false, false, 'Stationery, Printing, Paper Items', 'Fun & Lifestyle Spending'),
  (2026, 'off_pantry', 350, '{"Jan":380,"Feb":380,"Mar":380,"Apr":380,"May":380,"Jun":380,"Jul":380,"Aug":380,"Sep":380,"Oct":380,"Nov":0,"Dec":0}'::jsonb, false, false, 'Pantry & Cleaning Items', 'Fun & Lifestyle Spending'),
  (2026, 'off_it', 200, '{"Jan":250,"Feb":250,"Mar":250,"Apr":250,"May":250,"Jun":250,"Jul":250,"Aug":250,"Sep":250,"Oct":250,"Nov":0,"Dec":0}'::jsonb, false, false, 'IT Supplies', 'Fun & Lifestyle Spending'),
  (2026, 'off_furniture', 150, '{"Jan":0,"Feb":1800,"Mar":0,"Apr":0,"May":0,"Jun":0,"Jul":0,"Aug":0,"Sep":0,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Furniture and Fittings', 'Fun & Lifestyle Spending'),
  (2026, 'fin_perfectaim', 1500, '{"Jan":1500,"Feb":1500,"Mar":1500,"Apr":1500,"May":1500,"Jun":1500,"Jul":1500,"Aug":1500,"Sep":1500,"Oct":1500,"Nov":0,"Dec":0}'::jsonb, false, false, 'Finance team retainer', 'Professional Services'),
  (2026, 'fin_sg', 650, '{"Jan":650,"Feb":650,"Mar":650,"Apr":650,"May":650,"Jun":650,"Jul":650,"Aug":650,"Sep":650,"Oct":650,"Nov":0,"Dec":0}'::jsonb, false, false, 'Finance Team (SG)', 'Professional Services'),
  (2026, 'secretary', 90, '{"Jan":90,"Feb":90,"Mar":90,"Apr":90,"May":90,"Jun":90,"Jul":90,"Aug":90,"Sep":90,"Oct":90,"Nov":0,"Dec":0}'::jsonb, false, false, 'Secretary Fee', 'Professional Services'),
  (2026, 'cosec_sg', 200, '{"Jan":220,"Feb":220,"Mar":220,"Apr":220,"May":220,"Jun":220,"Jul":220,"Aug":220,"Sep":220,"Oct":220,"Nov":0,"Dec":0}'::jsonb, false, false, 'Co Sec (SG)', 'Professional Services'),
  (2026, 'filing', 50, '{"Jan":60,"Feb":60,"Mar":60,"Apr":60,"May":60,"Jun":60,"Jul":60,"Aug":60,"Sep":60,"Oct":60,"Nov":0,"Dec":0}'::jsonb, false, false, 'Filing Fee', 'Professional Services'),
  (2026, 'tax_agent', 200, '{"Jan":0,"Feb":0,"Mar":0,"Apr":2200,"May":0,"Jun":0,"Jul":0,"Aug":0,"Sep":0,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Tax Agent Fee', 'Professional Services'),
  (2026, 'audit', 400, '{"Jan":0,"Feb":0,"Mar":0,"Apr":0,"May":0,"Jun":0,"Jul":0,"Aug":0,"Sep":4200,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Audit Fee', 'Professional Services'),
  (2026, 'stripe', 3200, '{"Jan":2600,"Feb":2800,"Mar":3000,"Apr":3200,"May":3350,"Jun":3100,"Jul":3600,"Aug":3480,"Sep":3740,"Oct":3850,"Nov":0,"Dec":0}'::jsonb, false, false, 'Stripe Fee', 'Professional Services'),
  (2026, 'digital_mkt', 3000, '{"Jan":3200,"Feb":3200,"Mar":3200,"Apr":3200,"May":3200,"Jun":3200,"Jul":3200,"Aug":3200,"Sep":3200,"Oct":3200,"Nov":0,"Dec":0}'::jsonb, false, false, 'Digital Marketing', 'Professional Services'),
  (2026, 'ads_spend', 4200, '{"Jan":4500,"Feb":4500,"Mar":4500,"Apr":4500,"May":4500,"Jun":4500,"Jul":4500,"Aug":4500,"Sep":4500,"Oct":4500,"Nov":0,"Dec":0}'::jsonb, false, false, 'Ads Spend', 'Professional Services'),
  (2026, 'mkt_materials', 750, '{"Jan":800,"Feb":800,"Mar":800,"Apr":800,"May":800,"Jun":800,"Jul":800,"Aug":800,"Sep":800,"Oct":800,"Nov":0,"Dec":0}'::jsonb, false, false, 'Marketing Materials', 'Professional Services'),
  (2026, 'tech_dev', 3500, '{"Jan":3500,"Feb":3500,"Mar":3500,"Apr":3500,"May":3500,"Jun":3500,"Jul":3500,"Aug":3500,"Sep":3500,"Oct":3500,"Nov":0,"Dec":0}'::jsonb, false, false, 'Tech & Developer Team', 'Professional Services'),
  (2026, 'cleaning', 200, '{"Jan":200,"Feb":200,"Mar":200,"Apr":200,"May":200,"Jun":200,"Jul":200,"Aug":200,"Sep":200,"Oct":200,"Nov":0,"Dec":0}'::jsonb, false, false, 'Studio cleaning', 'Professional Services'),
  (2026, 'misc_prof', 250, '{"Jan":300,"Feb":300,"Mar":300,"Apr":300,"May":300,"Jun":300,"Jul":300,"Aug":300,"Sep":300,"Oct":300,"Nov":0,"Dec":0}'::jsonb, false, false, 'Miscellaneous (spending, helpers, subs, etc)', 'Professional Services'),
  (2026, 'sub_google', 120, '{"Jan":120,"Feb":120,"Mar":120,"Apr":120,"May":120,"Jun":120,"Jul":120,"Aug":120,"Sep":120,"Oct":120,"Nov":0,"Dec":0}'::jsonb, false, false, 'Google Workspace', 'Subscriptions'),
  (2026, 'sub_chatgpt', 90, '{"Jan":90,"Feb":90,"Mar":90,"Apr":90,"May":90,"Jun":90,"Jul":90,"Aug":90,"Sep":90,"Oct":90,"Nov":0,"Dec":0}'::jsonb, false, false, 'ChatGPT', 'Subscriptions'),
  (2026, 'sub_octopus', 55, '{"Jan":55,"Feb":55,"Mar":55,"Apr":55,"May":55,"Jun":55,"Jul":55,"Aug":55,"Sep":55,"Oct":55,"Nov":0,"Dec":0}'::jsonb, false, false, 'Email Octopus', 'Subscriptions'),
  (2026, 'sub_canva', 70, '{"Jan":70,"Feb":70,"Mar":70,"Apr":70,"May":70,"Jun":70,"Jul":70,"Aug":70,"Sep":70,"Oct":70,"Nov":0,"Dec":0}'::jsonb, false, false, 'Canva', 'Subscriptions'),
  (2026, 'sub_other', 80, '{"Jan":85,"Feb":85,"Mar":85,"Apr":85,"May":85,"Jun":85,"Jul":85,"Aug":85,"Sep":85,"Oct":85,"Nov":0,"Dec":0}'::jsonb, false, false, 'Other Subscriptions', 'Subscriptions'),
  (2026, 'sub_hosting', 25, '{"Jan":25,"Feb":25,"Mar":25,"Apr":25,"May":25,"Jun":25,"Jul":25,"Aug":25,"Sep":25,"Oct":25,"Nov":0,"Dec":0}'::jsonb, false, false, 'Website hosting', 'Subscriptions'),
  (2026, 'sub_systeme', 97, '{"Jan":97,"Feb":97,"Mar":97,"Apr":97,"May":97,"Jun":97,"Jul":97,"Aug":97,"Sep":97,"Oct":97,"Nov":0,"Dec":0}'::jsonb, false, false, 'Systeme.io', 'Subscriptions'),
  (2026, 'sub_misc', 40, '{"Jan":40,"Feb":40,"Mar":40,"Apr":40,"May":40,"Jun":40,"Jul":40,"Aug":40,"Sep":40,"Oct":40,"Nov":0,"Dec":0}'::jsonb, false, false, 'Miscellaneous Subscription', 'Subscriptions'),
  (2026, 'veh_insurance', 270, '{"Jan":3200,"Feb":0,"Mar":0,"Apr":0,"May":0,"Jun":0,"Jul":0,"Aug":0,"Sep":0,"Oct":0,"Nov":0,"Dec":0}'::jsonb, false, false, 'Motor Insurance', 'Vehicle Upkeep & Maintenance'),
  (2026, 'veh_service', 350, '{"Jan":0,"Feb":420,"Mar":0,"Apr":0,"May":480,"Jun":0,"Jul":0,"Aug":390,"Sep":0,"Oct":510,"Nov":0,"Dec":0}'::jsonb, false, false, 'Car Service', 'Vehicle Upkeep & Maintenance'),
  (2026, 'depreciation', 1450, '{"Jan":1450,"Feb":1450,"Mar":1450,"Apr":1450,"May":1450,"Jun":1450,"Jul":1450,"Aug":1450,"Sep":1450,"Oct":1450,"Nov":0,"Dec":0}'::jsonb, false, false, 'Depreciation *', 'Below the line'),
  (2026, 'loan_proton', 1280, '{"Jan":1280,"Feb":1280,"Mar":1280,"Apr":1280,"May":1280,"Jun":1280,"Jul":1280,"Aug":1280,"Sep":1280,"Oct":1280,"Nov":0,"Dec":0}'::jsonb, false, false, 'Car loan — runabout', 'Loans'),
  (2026, 'loan_denza', 2140, '{"Jan":2140,"Feb":2140,"Mar":2140,"Apr":2140,"May":2140,"Jun":2140,"Jul":2140,"Aug":2140,"Sep":2140,"Oct":2140,"Nov":0,"Dec":0}'::jsonb, false, false, 'Car loan — family van', 'Loans'),
  (2026, 'loan_maybank', 2680, '{"Jan":2680,"Feb":2680,"Mar":2680,"Apr":2680,"May":2680,"Jun":2680,"Jul":2680,"Aug":2680,"Sep":2680,"Oct":2680,"Nov":0,"Dec":0}'::jsonb, false, false, 'Bank term loan', 'Loans'),
  (2026, 'cp204', 900, '{"Jan":900,"Feb":900,"Mar":900,"Apr":900,"May":900,"Jun":900,"Jul":900,"Aug":900,"Sep":900,"Oct":900,"Nov":0,"Dec":0}'::jsonb, false, false, 'CP204 Tax Installment *', 'Loans')
on conflict (year, line_key) do update set
  monthly_budget = excluded.monthly_budget,
  actuals = excluded.actuals,
  hidden = excluded.hidden,
  is_custom = excluded.is_custom,
  label = excluded.label,
  section = excluded.section;

insert into public.kf_budget_month_status (year, month, checked) values
  (2026, 'Jan', true),
  (2026, 'Feb', true),
  (2026, 'Mar', true),
  (2026, 'Apr', true),
  (2026, 'May', true),
  (2026, 'Jun', true),
  (2026, 'Jul', true),
  (2026, 'Aug', true),
  (2026, 'Sep', true),
  (2026, 'Oct', false),
  (2026, 'Nov', false),
  (2026, 'Dec', false)
on conflict (year, month) do update set checked = excluded.checked;

insert into public.kf_budget_line_visibility (line_key, staff_visible) values
  ('total_sales', true),
  ('total_cogs', true),
  ('payroll_my', false),
  ('payroll_sg', false),
  ('epf_cpf', false),
  ('socso', false),
  ('eis', false),
  ('sdl_sg', false),
  ('incentive', false),
  ('rental', true),
  ('sinking_fund', false),
  ('maintenance', false),
  ('delivery', true),
  ('samples', true),
  ('company_trip', false),
  ('sponsorships', false),
  ('team_bonus', false),
  ('entertainment', true),
  ('util_electric', true),
  ('util_water', true),
  ('util_internet', true),
  ('util_phone', true),
  ('off_stationery', false),
  ('off_pantry', true),
  ('off_it', false),
  ('off_furniture', false),
  ('fin_perfectaim', false),
  ('fin_sg', false),
  ('secretary', false),
  ('cosec_sg', false),
  ('filing', false),
  ('tax_agent', false),
  ('audit', false),
  ('stripe', false),
  ('digital_mkt', false),
  ('ads_spend', false),
  ('mkt_materials', false),
  ('tech_dev', false),
  ('cleaning', false),
  ('misc_prof', false),
  ('sub_google', true),
  ('sub_chatgpt', true),
  ('sub_octopus', false),
  ('sub_canva', true),
  ('sub_other', false),
  ('sub_hosting', false),
  ('sub_systeme', false),
  ('sub_misc', false),
  ('veh_insurance', false),
  ('veh_service', false),
  ('depreciation', false),
  ('loan_proton', false),
  ('loan_denza', false),
  ('loan_maybank', false),
  ('cp204', false)
on conflict (line_key) do update set staff_visible = excluded.staff_visible;

insert into public.kf_budget_audit (id, line_key, year, month, field, old_value, new_value, user_id, user_name, created_at)
select v.id, v.line_key, v.year, v.month, v.field, v.old_value, v.new_value, u.id, v.user_name, v.created_at
from (values
  ('d4444444-4444-4444-8444-000000000001'::uuid, 'rental', 2026, 'Oct', 'actual', '3400', '3600', 'nora.king@kingfamily.demo', 'Nora King', '2026-10-03 09:10:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000002'::uuid, 'ads_spend', 2026, null, 'budget', '4000', '4200', 'adrian.king@kingfamily.demo', 'Adrian King', '2026-09-02 11:20:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000003'::uuid, '__month__', 2026, 'Sep', 'month_status', 'unchecked', 'checked', 'mira.king@kingfamily.demo', 'Mira King', '2026-10-01 16:05:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000004'::uuid, 'payroll_my', 2026, null, 'visibility', 'true', 'false', 'adrian.king@kingfamily.demo', 'Adrian King', '2026-03-04 10:00:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000005'::uuid, 'digital_mkt', 2026, 'Aug', 'actual', '2800', '3200', 'sable.king@kingfamily.demo', 'Sable King', '2026-08-28 15:40:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000006'::uuid, 'total_cogs', 2026, 'Jul', 'actual', '54000', '57200', 'nora.king@kingfamily.demo', 'Nora King', '2026-08-02 09:25:00+08'::timestamptz),
  ('d4444444-4444-4444-8444-000000000007'::uuid, 'company_trip', 2026, 'Aug', 'actual', '0', '8500', 'mira.king@kingfamily.demo', 'Mira King', '2026-08-20 13:15:00+08'::timestamptz)
) as v(id, line_key, year, month, field, old_value, new_value, email, user_name, created_at)
join public.kf_users u on u.email = v.email
on conflict (id) do update set
  line_key = excluded.line_key,
  year = excluded.year,
  month = excluded.month,
  field = excluded.field,
  old_value = excluded.old_value,
  new_value = excluded.new_value,
  user_id = excluded.user_id,
  user_name = excluded.user_name,
  created_at = excluded.created_at;

insert into public.kf_kanban_board (id, data, updated_at) values (
  1,
  $kanban${"columns":[{"id":"col-todo","title":"To Do","color":"#6B3FA0","cards":[{"id":"card-portrait","text":"Book the family portrait session for the case-study brief"},{"id":"card-insurance","text":"Renew the studio contents insurance before November"},{"id":"card-thanks","text":"Draft the Q4 client thank-you notes"}]},{"id":"col-doing","title":"In Progress","color":"#2ecc71","cards":[{"id":"card-recon","text":"October client reconciliations"},{"id":"card-house","text":"Plan the December open house"}]},{"id":"col-wait","title":"Waiting","color":"#e0813a","cards":[{"id":"card-hartwell","text":"Hartwell & Co contract signature"}]},{"id":"col-done","title":"Done","color":"#9b6bd6","cards":[{"id":"card-sep","text":"Close the September books"},{"id":"card-aug","text":"File the August sales summary"}]}]}$kanban$::jsonb,
  '2026-10-04 17:45:00+08'::timestamptz
)
on conflict (id) do update set
  data = excluded.data,
  updated_at = excluded.updated_at;

insert into public.kf_kanban_audit (id, detail, user_id, user_name, created_at)
select v.id, v.detail, u.id, v.user_name, v.created_at
from (values
  ('e5555555-5555-4555-8555-000000000001'::uuid, 'added card "Book the family portrait session for the case-study brief" to To Do', 'mira.king@kingfamily.demo', 'Mira King', '2026-09-12 10:05:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000002'::uuid, 'added card "October client reconciliations" to To Do', 'nora.king@kingfamily.demo', 'Nora King', '2026-10-01 09:00:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000003'::uuid, 'moved "October client reconciliations" from To Do to In Progress', 'nora.king@kingfamily.demo', 'Nora King', '2026-10-02 11:30:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000004'::uuid, 'moved "Close the September books" from In Progress to Done', 'nora.king@kingfamily.demo', 'Nora King', '2026-10-03 16:10:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000005'::uuid, 'added a new list', 'adrian.king@kingfamily.demo', 'Adrian King', '2026-06-02 14:00:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000006'::uuid, 'renamed list "Blocked" → "Waiting"', 'leo.king@kingfamily.demo', 'Leo King', '2026-07-08 09:40:00+08'::timestamptz),
  ('e5555555-5555-4555-8555-000000000007'::uuid, 'added card "Hartwell & Co contract signature" to Waiting', 'sable.king@kingfamily.demo', 'Sable King', '2026-10-04 15:20:00+08'::timestamptz)
) as v(id, detail, email, user_name, created_at)
join public.kf_users u on u.email = v.email
on conflict (id) do update set
  detail = excluded.detail,
  user_id = excluded.user_id,
  user_name = excluded.user_name,
  created_at = excluded.created_at;

commit;

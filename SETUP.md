# King Family Dash

Vite + React dashboard. Same tabs as the existing family dashboard (Dashboard, Leave, Integrity checklist, Sales, Budget, Documents, Scoreboard, Kanban, Admin), in a royal purple theme. It uses the shared Supabase project, but only the `kf_` tables created by `schema.sql`.

## 1. Create the tables

Open the Supabase SQL editor for the existing project and run **`schema.sql`** from top to bottom.

That file only creates `kf_*` tables, indexes, row level security policies, and grants. It does not alter or drop anything already in the database. It is safe to run again.

There is no separate Supabase project. King Family Dash reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the same project, and every query goes to a `kf_` table.

## 2. Load the demo case study

Run **`supabase/kingfamily_seed.sql`** after `schema.sql`. It only writes `kf_` tables and can be run again.

The dashboard does not use Supabase Auth. It compares the password to the plain-text `password` column on `kf_users`, which is how the original app logs people in. Every demo account uses the password **kingdemo**.

| Email | Role | Name |
| --- | --- | --- |
| adrian.king@kingfamily.demo | admin | Adrian King |
| mira.king@kingfamily.demo | supervisor | Mira King |
| leo.king@kingfamily.demo | staff | Leo King |
| sable.king@kingfamily.demo | staff | Sable King |
| nora.king@kingfamily.demo | staff | Nora King |

These people are fictional. Sign in as Adrian to see Budget and Admin.

On the Budget tab for 2026, **Net Profit (Actual YTD)** should read **RM 1,186,400**. That card is closed sales for the year minus COGS, operating expenses, depreciation, loans, and tax installments. November and December are still zero, so the figure is the position through October 2026.

## 3. Configure the app

```bash
cp .env.example .env
```

Set:

- `VITE_SUPABASE_URL` — project URL
- `VITE_SUPABASE_ANON_KEY` — anon (public) key

Do not commit `.env`. Do not put the service role key in the frontend.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

On Vercel, set the same two environment variables, use the Vite framework, and Node 24.

## 4. What the demo seed contains

`supabase/kingfamily_seed.sql` fills every table the tabs use: users, leave, integrity checklists, sales targets and entries, budget lines (January–October 2026), month checkmarks, line visibility, budget audit, and a kanban board with history. Documents are built into the app and do not use a table.

`schema.sql` alone leaves an empty kanban board and placeholder sales targets. The seed replaces those. Opening Budget before the seed runs can insert zero-amount lines; running the seed afterwards overwrites them.

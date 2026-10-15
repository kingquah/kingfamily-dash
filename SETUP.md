# Pulse Dashboard

Vite + React dashboard. Same tabs and purple look as before: Dashboard, Budget, Scoreboard, Leave, Checklist, Kanban, and Documents. Admin is a gear for the admin role only. It uses the shared Supabase project, but only the `kf_` tables.

## Deploy order

Do these in order. The app expects the lock to already be in the database.

1. **Fresh database only:** run `schema.sql`, then `supabase/kingfamily_seed.sql`.
2. **Every database, including the live one:** run `supabase/kingfamily_security.sql` in the Supabase SQL editor. It is safe to run again. It does not rewrite budget, sales, leave, checklist, or kanban rows.
3. Set the server secret `SUPABASE_SERVICE_ROLE_KEY` (see below).
4. Deploy the app.

Do not re-run `supabase/kingfamily_seed.sql` on the live database. Its budget rows were edited there, and the seed overwrites those lines on conflict.

`schema.sql` only creates `kf_*` tables and missing columns. It does not drop tables or open them to the public anon key. Row access lives in `supabase/kingfamily_security.sql`.

## Sign-in

Sign-in is Supabase Auth email and password. The security SQL links each existing `kf_users` row to an Auth user. A person who is not linked yet gets a new Auth account with the temporary password **kingdemo**. Accounts that are already linked keep their password.

| Email | Role | Name |
| --- | --- | --- |
| king@kingfamily.demo | admin | King |
| mira.king@kingfamily.demo | supervisor | Mira King |
| leo.king@kingfamily.demo | staff | Leo King |
| sable.king@kingfamily.demo | staff | Sable King |
| nora.king@kingfamily.demo | staff | Nora King |

After the first sign-in, an admin can set a real password from Admin. The screen never shows the current password.

In the Supabase Auth settings for this project:

- Turn off public sign-ups, so strangers cannot create their own login.
- Email confirmation can stay off. The migration marks the five accounts confirmed, and new accounts created from Admin are confirmed by the server.

Staff can use Dashboard, Scoreboard (their own rows), Leave, Checklist, and Kanban. They cannot open Budget or Admin. Supervisors keep Budget and can manage leave, checklists, and scoreboard rows. Only an admin can open Admin or promote someone to admin.

On the Budget tab for 2026, **Net Profit (Actual YTD)** should read **RM 1,186,400** when the demo seed is the data. That card is closed sales for the year minus COGS, operating expenses, depreciation, loans, and tax installments.

## Configure the app

```bash
cp .env.example .env
```

Browser (public):

- `VITE_SUPABASE_URL` — project URL
- `VITE_SUPABASE_ANON_KEY` — anon key

Server only, for Admin create / password reset / delete (`api/admin-users.js`):

- `SUPABASE_SERVICE_ROLE_KEY` — the Supabase service role key

Never prefix the service role key with `VITE_`. The browser must not receive it. On Vercel, add `SUPABASE_SERVICE_ROLE_KEY` in project settings. The URL can be `SUPABASE_URL` or the existing `VITE_SUPABASE_URL`.

```bash
npm install
npm run dev
```

`npm run dev` serves `/api/admin-users` locally. Production is the same file as a Vercel serverless function.

```bash
npm test
npm run build
```

On Vercel, use the Vite framework and Node 24. Deploy only after the security SQL has been applied.

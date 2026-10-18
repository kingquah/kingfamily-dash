# Pulse Dashboard

Vite + React dashboard for a small online shop. Tabs: Dashboard, Products, Budget, Scoreboard, Leave, Rocks, Kanban, and Documents. Admin is a gear for the admin role only. Checklist is no longer in the nav; its tables stay in the database. It uses the shared Supabase project, but only the `kf_` tables.

## Deploy order

Do these in order. The app expects the lock to already be in the database.

1. **Fresh database only:** run `schema.sql`, then `supabase/kingfamily_seed.sql`.
2. **Every database, including the live one:** run `supabase/kingfamily_security.sql` in the Supabase SQL editor. It is safe to run again. It does not rewrite budget, sales, leave, checklist, or kanban rows.
3. **Every database, including the live one:** run `supabase/pulse_ecommerce.sql`. It adds the shop tables and copies old budget lines into Revenue plus the seven cost lines. It does not delete rows. If you run the security file again later, run this file again afterwards.
4. Optional, and skip it on the live shop: `supabase/pulse_ecommerce_seed.sql` adds sample SKUs and Q4 2026 rocks. It does not overwrite rows that are already there.
5. Set the server secret `SUPABASE_SERVICE_ROLE_KEY` (see below).
6. Deploy the app.

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

Staff can use Dashboard, Products (units sold, not SKU edits), Scoreboard (their own rows), Leave, Rocks (progress and status), and Kanban. They cannot open Budget or Admin. Supervisors keep Budget and can edit SKUs, rock details, leave, and scoreboard rows. Only an admin can open Admin or promote someone to admin.

On the Budget tab, **Net Profit (Actual YTD)** is revenue minus cost of goods, labour, shipping, platform fees, marketing, taxes, and miscellaneous. After `pulse_ecommerce.sql` rolls the demo seed forward, that card should still read **RM 1,186,400**. The old lines are hidden and copied into `kf_budget_line_archive`.

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

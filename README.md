# Pulse Dashboard

Family dashboard (dashboard, budget, scoreboard, leave, checklist, kanban, documents, admin) with a royal purple theme.

Data lives in `kf_` tables on the shared Supabase project. Apply [schema.sql](schema.sql) on a fresh database, then [supabase/kingfamily_seed.sql](supabase/kingfamily_seed.sql). On the live database, skip the seed and run [supabase/kingfamily_security.sql](supabase/kingfamily_security.sql) before deploying. Sign-in is Supabase Auth. See [SETUP.md](SETUP.md).

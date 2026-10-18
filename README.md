# Pulse Dashboard

Shop dashboard (dashboard, products, budget, scoreboard, leave, rocks, kanban, documents, admin) with a royal purple theme.

Data lives in `kf_` tables on the shared Supabase project. Apply [schema.sql](schema.sql) on a fresh database, then [supabase/kingfamily_seed.sql](supabase/kingfamily_seed.sql). On the live database, skip that seed and run [supabase/kingfamily_security.sql](supabase/kingfamily_security.sql), then [supabase/pulse_ecommerce.sql](supabase/pulse_ecommerce.sql), then [supabase/pulse_fresh_start.sql](supabase/pulse_fresh_start.sql), before deploying. The shop budget starts on 1 October 2026. Sign-in is Supabase Auth. See [SETUP.md](SETUP.md).

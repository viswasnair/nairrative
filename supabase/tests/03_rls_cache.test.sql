-- RLS tests for cache tables: analysis_cache, recs_cache, panel_prompts
-- Run with: supabase test db

BEGIN;
SELECT plan(6);

-- ── analysis_cache: anon can SELECT ──────────────────────────────────────────
SET LOCAL role TO anon;
SELECT lives_ok(
  $$SELECT * FROM public.analysis_cache LIMIT 1$$,
  'anon role: SELECT from analysis_cache is allowed'
);

-- ── recs_cache: anon can SELECT ───────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT * FROM public.recs_cache LIMIT 1$$,
  'anon role: SELECT from recs_cache is allowed'
);

-- ── panel_prompts: anon can SELECT ────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT * FROM public.panel_prompts LIMIT 1$$,
  'anon role: SELECT from panel_prompts is allowed'
);

-- ── analysis_cache: anon cannot INSERT ───────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.analysis_cache (id, user_id, data, fingerprint) VALUES (1, gen_random_uuid(), '{}'::jsonb, 'fp')$$,
  'new row violates row-level security policy for table "analysis_cache"',
  'anon role: INSERT into analysis_cache is blocked by RLS'
);

-- ── recs_cache: anon cannot INSERT ────────────────────────────────────────────
SELECT throws_ok(
  $$INSERT INTO public.recs_cache (id, user_id, data, fingerprint) VALUES (1, gen_random_uuid(), '{}'::jsonb, 'fp')$$,
  'new row violates row-level security policy for table "recs_cache"',
  'anon role: INSERT into recs_cache is blocked by RLS'
);

-- ── Schema: analysis_cache has fingerprint column (used for cache invalidation) ─
RESET role;
SELECT has_column('public', 'analysis_cache', 'fingerprint', 'analysis_cache has fingerprint column');

SELECT * FROM finish();
ROLLBACK;

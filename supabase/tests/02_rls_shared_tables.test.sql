-- RLS tests for shared lookup tables: genres and authors
-- Run with: npm run test:db  (requires supabase link + Docker, or use MCP execute_sql)
--
-- Actual RLS posture:
--   genres  — SELECT: public, INSERT: public (all roles), no UPDATE/DELETE policy
--   authors — SELECT: public, INSERT: public (all roles),
--             UPDATE: public but scoped to own books via book_authors join
--             DELETE: public but only orphaned authors

BEGIN;
SELECT plan(6);

-- ── genres: anon can SELECT ───────────────────────────────────────────────────
SET LOCAL role TO anon;
SELECT lives_ok(
  $$SELECT * FROM public.genres LIMIT 1$$,
  'anon role: SELECT from genres is allowed'
);

-- ── genres: anon can INSERT (policy applies to all roles — shared lookup) ─────
SELECT lives_ok(
  $$INSERT INTO public.genres (name, color, sort_order) VALUES ('__pgtap_genre__', '#ffffff', 999)$$,
  'anon role: INSERT into genres is allowed (public RLS policy)'
);

-- ── genres: no UPDATE policy — UPDATE silently affects 0 rows ────────────────
-- There is no UPDATE policy on genres, so RLS blocks all updates silently.
UPDATE public.genres SET color = '#000000' WHERE name = '__pgtap_genre__';
SELECT is(
  (SELECT color FROM public.genres WHERE name = '__pgtap_genre__'),
  '#ffffff',
  'anon role: UPDATE on genres silently affects 0 rows (no UPDATE policy exists)'
);

-- ── authors: anon can SELECT ──────────────────────────────────────────────────
SELECT lives_ok(
  $$SELECT * FROM public.authors LIMIT 1$$,
  'anon role: SELECT from authors is allowed'
);

-- ── authors: anon can INSERT (policy applies to all roles — shared lookup) ────
SELECT lives_ok(
  $$INSERT INTO public.authors (name) VALUES ('__pgtap_author__')$$,
  'anon role: INSERT into authors is allowed (public RLS policy)'
);

-- ── Schema: genres table has expected columns ─────────────────────────────────
RESET role;
SELECT has_column('public', 'genres', 'name', 'genres table has name column');

SELECT * FROM finish();
ROLLBACK;

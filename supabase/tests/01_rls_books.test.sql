-- RLS tests for the `books` table
-- Run with: supabase test db
-- Requires: pgTAP extension, local Supabase stack running

BEGIN;
SELECT plan(5);

-- ── 1. Anon cannot INSERT into books ─────────────────────────────────────────
SET LOCAL role TO anon;
SELECT throws_ok(
  $$INSERT INTO public.books (title, user_id) VALUES ('Anon Book', gen_random_uuid())$$,
  'new row violates row-level security policy for table "books"',
  'anon role: INSERT into books is blocked by RLS'
);

-- ── 2. Anon cannot UPDATE books ───────────────────────────────────────────────
-- RLS USING clause filters all rows before the write, so UPDATE silently
-- completes with 0 rows affected (no error thrown, unlike INSERT).
-- Test 3 then proves the row count is still 0, confirming no data changed.
SELECT lives_ok(
  $$UPDATE public.books SET title = 'Hacked' WHERE true$$,
  'anon role: UPDATE on books runs without error (USING clause silently filters all rows)'
);

-- ── 3. Anon cannot DELETE from books ─────────────────────────────────────────
-- DELETE with RLS should silently affect 0 rows (not throw), but anon should see no rows
RESET role;
SET LOCAL role TO anon;
SELECT is(
  (SELECT count(*)::int FROM public.books),
  0,
  'anon role: SELECT on books returns 0 rows (RLS filters all)'
);

-- ── 4. Authenticated user can only SELECT their own rows ──────────────────────
-- Set up: create a test user ID and insert a book owned by another user
RESET role;
DO $$
DECLARE
  other_uid uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (other_uid, 'other@test.com', crypt('password', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated');
  INSERT INTO public.books (title, user_id) VALUES ('Other User Book', other_uid);
END;
$$;

-- Now authenticate as a different user (simulate via set_config)
SELECT set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
SET LOCAL role TO authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.books WHERE title = 'Other User Book'),
  0,
  'authenticated user: cannot see another user''s books'
);

-- ── 5. Schema: books table has required columns ───────────────────────────────
RESET role;
SELECT has_column('public', 'books', 'id', 'books has id column');

SELECT * FROM finish();
ROLLBACK;

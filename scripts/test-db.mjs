#!/usr/bin/env node
/**
 * pgTAP test runner — no Docker required.
 *
 * Runs every *.test.sql file in supabase/tests/ against the linked Supabase
 * project using `supabase db query --linked`. This is an alternative to
 * `supabase test db` which requires Docker Desktop to run the pg_prove image.
 *
 * Prerequisites:
 *   npx supabase login          ← one-time, stores personal access token
 *   npx supabase link --project-ref <dev-ref>
 *
 * Usage:  node scripts/test-db.mjs
 *         npm run test:db
 */

import { execSync }    from 'child_process'
import { readdirSync } from 'fs'

const TEST_DIR = 'supabase/tests'

const files = readdirSync(TEST_DIR)
  .filter(f => f.endsWith('.test.sql'))
  .sort()

if (files.length === 0) {
  console.error(`No *.test.sql files found in ${TEST_DIR}`)
  process.exit(1)
}

console.log(`Running ${files.length} pgTAP test file(s) against linked project...\n`)

let passed = 0
let failed = 0

for (const file of files) {
  const path = `${TEST_DIR}/${file}`
  process.stdout.write(`  ${path} ... `)

  try {
    // --agent=yes: always emit the JSON boundary envelope (consistent output)
    const raw = execSync(
      `npx supabase db query --linked --agent=yes -f "${path}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    )

    let rows = []
    try {
      const parsed = JSON.parse(raw)
      rows = parsed.rows ?? []
    } catch {
      // raw isn't JSON — treat entire output as a single row value for scanning
      rows = [{ _raw: raw }]
    }

    // pgTAP's finish() surfaces "# Looks like you failed N tests" when tests fail.
    // When all pass, finish() returns no rows and the last visible row is the
    // final ok-assertion (e.g. has_column / is / lives_ok result).
    const allText = JSON.stringify(rows)
    const failMatch = allText.match(/failed \d+ test/)

    if (failMatch) {
      const finishRow = rows.find(r => JSON.stringify(r).includes('failed'))
      console.log('FAIL')
      console.log(`    ${JSON.stringify(finishRow ?? rows)}`)
      failed++
    } else {
      const lastVal = rows.length ? Object.values(rows[rows.length - 1])[0] : '(no output)'
      console.log(`ok  [${lastVal}]`)
      passed++
    }
  } catch (err) {
    console.log('ERROR')
    const msg = (err.stderr || err.stdout || err.message || '').trim()
    console.log(`    ${msg.split('\n')[0]}`)
    failed++
  }
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)

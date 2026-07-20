/**
 * Concatenate staging SQL for copy-paste into Supabase SQL Editor.
 * Usage: node scripts/print-staging-sql-order.mjs
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'supabase/schema.sql',
  'supabase/migrations/20260609120000_profile_age_and_consents.sql',
  'supabase/migrations/20260613120000_coach_query_cache.sql',
  'supabase/migrations/20260709120000_mcp_audit_log.sql',
  'supabase/migrations/20260717120000_nutrition_tracker.sql',
  'supabase/staging-setup.sql',
]

for (const rel of files) {
  const path = join(root, rel)
  console.log(`\n======= BEGIN ${rel} =======\n`)
  console.log(readFileSync(path, 'utf8'))
  console.log(`\n======= END ${rel} =======\n`)
}

console.error(`Printed ${files.length} SQL files. Apply one at a time in Supabase SQL Editor.`)

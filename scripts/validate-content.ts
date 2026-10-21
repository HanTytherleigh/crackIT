// Fails the build if any file under /content does not match its schema.
import { readFileSync } from 'node:fs'
import { modulesFileSchema } from '../src/content/schema'

let failed = false

function check(path: string, parse: (data: unknown) => { success: boolean; error?: { issues: unknown[] } }) {
  let data: unknown
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    console.error(`✗ ${path}: invalid JSON (${(e as Error).message})`)
    failed = true
    return
  }
  const result = parse(data)
  if (!result.success) {
    console.error(`✗ ${path}`)
    console.error(JSON.stringify(result.error?.issues, null, 2))
    failed = true
  } else {
    console.log(`✓ ${path}`)
  }
}

check('content/modules.json', (d) => modulesFileSchema.safeParse(d))

if (failed) {
  console.error('Content validation failed.')
  process.exit(1)
}

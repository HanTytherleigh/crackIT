// Fails the build if any file under /content does not match its schema,
// or if files and the module map disagree with each other.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ZodType } from 'zod'
import { complexityDrillSchema, modulesFileSchema, topicSchema, type ModulesFile } from '../src/content/schema'

const errors: string[] = []

function load<T>(path: string, schema: ZodType<T>): T | undefined {
  let data: unknown
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    errors.push(`${path}: invalid JSON (${(e as Error).message})`)
    return undefined
  }
  const result = schema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) errors.push(`${path}: ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    return undefined
  }
  console.log(`✓ ${path}`)
  return result.data
}

const map = load('content/modules.json', modulesFileSchema) as ModulesFile | undefined

if (map) {
  for (const m of map.modules) {
    const topicIds = new Set(m.topics.map((t) => t.id))
    const referenced = new Set<string>()
    for (const ref of m.topics) {
      if (!ref.file) continue
      referenced.add(ref.file)
      const path = join('content', m.id, ref.file)
      if (!existsSync(path)) {
        errors.push(`content/modules.json: topic "${ref.id}" points at missing file ${path}`)
        continue
      }
      const topic = load(path, topicSchema)
      if (!topic) continue
      if (topic.id !== ref.id) errors.push(`${path}: id "${topic.id}" does not match the module map ("${ref.id}")`)
      if (topic.moduleId !== m.id) errors.push(`${path}: moduleId "${topic.moduleId}" should be "${m.id}"`)
      for (const p of topic.prerequisites)
        if (!topicIds.has(p)) errors.push(`${path}: unknown prerequisite "${p}"`)
    }
    // A topic file that the map does not reference would never be shown.
    const dir = join('content', m.id)
    if (existsSync(dir))
      for (const f of readdirSync(dir))
        if (f.endsWith('.json') && !referenced.has(f)) errors.push(`${join(dir, f)}: not referenced from content/modules.json`)
  }
}

// Drill files, each with its own schema.
const drillSchemas: Record<string, ZodType<unknown>> = { 'complexity-reading.json': complexityDrillSchema }
for (const f of readdirSync('content/drills')) {
  if (!f.endsWith('.json')) continue
  const schema = drillSchemas[f]
  if (!schema) errors.push(`content/drills/${f}: no schema registered for this drill file`)
  else load(join('content/drills', f), schema)
}

if (errors.length) {
  console.error('\nContent validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'))
  process.exit(1)
}

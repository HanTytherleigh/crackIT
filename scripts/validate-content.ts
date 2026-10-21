// Fails the build if any file under /content does not match its schema,
// or if files and the module map disagree with each other.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ZodType } from 'zod'
import {
  complexityDrillSchema,
  complexityPredictionDrillSchema,
  lookalikeDrillSchema,
  modulesFileSchema,
  patternsFileSchema,
  signalDrillSchema,
  topicSchema,
  type LookalikeDrill,
  type ModulesFile,
  type PatternsFile,
  type SignalDrill,
} from '../src/content/schema'

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
const drillSchemas: Record<string, ZodType<unknown>> = {
  'complexity-reading.json': complexityDrillSchema,
  'signal-spotting.json': signalDrillSchema,
  'lookalikes.json': lookalikeDrillSchema,
  'complexity-prediction.json': complexityPredictionDrillSchema,
}
const drills: Record<string, unknown> = {}
for (const f of readdirSync('content/drills')) {
  if (!f.endsWith('.json')) continue
  const schema = drillSchemas[f]
  if (!schema) errors.push(`content/drills/${f}: no schema registered for this drill file`)
  else drills[f] = load(join('content/drills', f), schema)
}

// The pattern catalogue, and every pattern id the drills point at.
const catalogue = load('content/patterns.json', patternsFileSchema) as PatternsFile | undefined
if (catalogue) {
  const patternIds = new Set(catalogue.patterns.map((p) => p.id))
  const topicIds = new Set(map?.modules.flatMap((m) => m.topics.map((t) => t.id)) ?? [])
  for (const p of catalogue.patterns)
    if (!topicIds.has(p.topic)) errors.push(`content/patterns.json: ${p.id} links to unknown topic "${p.topic}"`)
  const need = (file: string, id: string, ref: string) => {
    if (!patternIds.has(ref)) errors.push(`content/drills/${file}: ${id} refers to unknown pattern "${ref}"`)
  }
  const signal = drills['signal-spotting.json'] as SignalDrill | undefined
  for (const it of signal?.items ?? []) [it.pattern, ...it.options].forEach((r) => need('signal-spotting.json', it.id, r))
  const lookalike = drills['lookalikes.json'] as LookalikeDrill | undefined
  for (const it of lookalike?.items ?? []) [it.a.pattern, it.b.pattern].forEach((r) => need('lookalikes.json', it.id, r))
}

if (errors.length) {
  console.error('\nContent validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'))
  process.exit(1)
}

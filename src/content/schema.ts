import { z } from 'zod'

// Schemas for everything under /content. The build runs scripts/validate-content.ts,
// which parses every file with these and fails on the first error.

export const topicRefSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  /** File name inside the module folder, e.g. "01-big-o.json". Absent until authored. */
  file: z.string().regex(/^[a-z0-9-]+\.json$/).optional(),
})

export const moduleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['available', 'locked']),
  /** Interview-relevant areas the recap will cover; shown on locked placeholders. */
  covers: z.array(z.string()),
  topics: z.array(topicRefSchema),
})

export const modulesFileSchema = z
  .object({
    schemaVersion: z.literal(1),
    modules: z.array(moduleSchema).min(1),
  })
  .superRefine((file, ctx) => {
    const ids = new Set<string>()
    for (const m of file.modules) {
      if (ids.has(m.id)) ctx.addIssue({ code: 'custom', message: `Duplicate module id "${m.id}"` })
      ids.add(m.id)
      if (m.status === 'locked' && m.topics.length > 0)
        ctx.addIssue({ code: 'custom', message: `Locked module "${m.id}" must have an empty topic list` })
    }
  })

export type TopicRef = z.infer<typeof topicRefSchema>
export type Module = z.infer<typeof moduleSchema>
export type ModulesFile = z.infer<typeof modulesFileSchema>

// ---------------------------------------------------------------------------
// Topic files: /content/<module>/<nn>-<topic>.json
// No field has a default: the app reads these files without parsing them, so every
// field the renderer relies on must be written out in the JSON.

/** Every interactive widget the lesson renderer knows how to embed. */
export const widgetIds = [
  'growth-plotter',
  'binary-search-stepper',
  'complexity-reader',
  'array-ops',
  'two-pointers',
  'hash-table',
  'linked-list',
  'stack-queue',
  'call-stack',
  'tree-traversal',
  'heap',
  'graph',
  'dp-table',
] as const
export const widgetIdSchema = z.enum(widgetIds)
export type WidgetId = z.infer<typeof widgetIdSchema>

const idSchema = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case')
/** Text fields accept a small Markdown subset; see src/components/Prose.tsx. */
const prose = z.string().min(1)

export const snippetSchema = z.object({
  ts: z.string().min(1),
  py: z.string().min(1),
})

/** Hints climb a fixed ladder and never start with the full solution. */
export const hintSchema = z.object({
  level: z.enum(['nudge', 'pattern', 'approach']),
  text: prose,
})
const hintsSchema = z
  .array(hintSchema)
  .max(3)
  .refine((hs) => hs.every((h, i) => i === 0 || order[h.level] > order[hs[i - 1]!.level]), {
    message: 'hints must go nudge, then pattern, then approach',
  })
const order = { nudge: 0, pattern: 1, approach: 2 } as const

const checkBase = {
  id: idSchema,
  prompt: prose,
  /** Optional code shown with the question. */
  code: snippetSchema.optional(),
  explanation: prose,
  hints: hintsSchema,
}

export const checkSchema = z.discriminatedUnion('kind', [
  z.object({
    ...checkBase,
    kind: z.literal('choice'),
    options: z.array(z.string().min(1)).min(2).max(6),
    answer: z.number().int().min(0),
  }),
  z.object({
    ...checkBase,
    kind: z.literal('text'),
    /** Accepted answers, compared after normalisation (case, spaces, n^2 vs n²). */
    accept: z.array(z.string().min(1)).min(1),
    placeholder: z.string().optional(),
  }),
  z.object({
    ...checkBase,
    kind: z.literal('number'),
    answer: z.number(),
    /** Absolute tolerance for estimates such as "about 20 guesses". */
    tolerance: z.number().min(0),
  }),
])

export const topicSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    moduleId: idSchema,
    title: z.string().min(1),
    summary: z.string().min(1),
    estimatedMinutes: z.number().int().min(5).max(40),
    prerequisites: z.array(idSchema),
    recallPrompts: z
      .array(z.object({ id: idSchema, prompt: prose }))
      .min(1),
    mentalModel: z.object({
      analogy: prose,
      sections: z
        .array(
          z.object({
            id: idSchema,
            heading: z.string().min(1),
            body: prose,
            code: snippetSchema.optional(),
            widget: widgetIdSchema.optional(),
          }),
        )
        .min(1),
    }),
    /** Widgets this topic embeds. Each must also appear on a section above. */
    widgets: z.array(widgetIdSchema),
    explainBack: z.object({
      prompt: prose,
      rubric: z.array(z.object({ id: idSchema, point: z.string().min(1) })).min(2),
      /** How many rubric points count as a pass. Defaults to two thirds, rounded up. */
      passMark: z.number().int().min(1).optional(),
    }),
    checks: z.array(checkSchema).min(2),
    handsOn: z.object({
      prompt: prose,
      starter: snippetSchema.optional(),
      hints: hintsSchema,
      reference: snippetSchema,
      explanation: prose,
      selfCheck: z.array(z.string().min(1)).min(1),
    }),
    commonMistakes: z.array(z.object({ mistake: prose, fix: prose })).min(1),
  })
  .superRefine((t, ctx) => {
    const unique = (label: string, ids: string[]) => {
      const seen = new Set<string>()
      for (const id of ids) {
        if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `Duplicate ${label} id "${id}"` })
        seen.add(id)
      }
    }
    unique('recall prompt', t.recallPrompts.map((r) => r.id))
    unique('section', t.mentalModel.sections.map((s) => s.id))
    unique('rubric', t.explainBack.rubric.map((r) => r.id))
    unique('check', t.checks.map((c) => c.id))

    for (const c of t.checks) {
      if (c.kind === 'choice' && c.answer >= c.options.length)
        ctx.addIssue({ code: 'custom', message: `Check "${c.id}" answer index is out of range` })
    }
    if (t.explainBack.passMark !== undefined && t.explainBack.passMark > t.explainBack.rubric.length)
      ctx.addIssue({ code: 'custom', message: 'explainBack.passMark is larger than the rubric' })

    const embedded = new Set(t.mentalModel.sections.flatMap((s) => (s.widget ? [s.widget] : [])))
    for (const w of t.widgets)
      if (!embedded.has(w)) ctx.addIssue({ code: 'custom', message: `Widget "${w}" is listed but no section embeds it` })
    for (const w of embedded)
      if (!t.widgets.includes(w)) ctx.addIssue({ code: 'custom', message: `Section embeds "${w}" but widgets does not list it` })
  })

export type Snippet = z.infer<typeof snippetSchema>
export type Hint = z.infer<typeof hintSchema>
export type Check = z.infer<typeof checkSchema>
export type Topic = z.infer<typeof topicSchema>


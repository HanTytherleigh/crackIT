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
  covers: z.array(z.string()).default([]),
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

import { z } from 'zod'
import { lessonStages, PROGRESS_SCHEMA_VERSION } from './progressModel'

// Validates progress files before import. Mirrors the interfaces in progressModel.ts.

const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'expected an ISO date')

const checkRecord = z.object({
  attempts: z.number().int().min(0),
  lastAnswer: z.string(),
  correct: z.boolean(),
  passedAt: iso.optional(),
  revealed: z.boolean(),
})

const topicProgress = z.object({
  startedAt: iso,
  updatedAt: iso,
  furthestStage: z.enum(lessonStages),
  recall: z.record(z.string(), z.string()),
  checks: z.record(z.string(), checkRecord),
  checkHints: z.record(z.string(), z.number().int().min(0)),
  explainBack: z
    .object({ text: z.string(), covered: z.array(z.string()), submittedAt: iso })
    .optional(),
  handsOn: z
    .object({
      attempt: z.string(),
      triedAt: iso.optional(),
      hintsShown: z.number().int().min(0),
      revealed: z.boolean(),
      selfCheck: z.array(z.number().int().min(0)),
    })
    .optional(),
  checksPassedAt: iso.optional(),
  explainBackPassedAt: iso.optional(),
  recheckPassedAt: iso.optional(),
})

const reviewCard = z.object({
  id: z.string(),
  box: z.number().int().min(0),
  due: iso,
  reviews: z.number().int().min(0),
  lapses: z.number().int().min(0),
  lastReviewedAt: iso.optional(),
})

export const progressDataSchema = z.object({
  schemaVersion: z.literal(PROGRESS_SCHEMA_VERSION),
  topics: z.record(z.string(), topicProgress),
  review: z.object({ cards: z.record(z.string(), reviewCard) }),
  lastLesson: z.object({ moduleId: z.string(), topicId: z.string() }).optional(),
  lastExportedAt: iso.optional(),
})

export const settingsBackupSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']),
  reducedMotion: z.boolean(),
  focusTimerMinutes: z.number().int().min(0).max(120),
  snippetLanguage: z.enum(['ts', 'py']),
})

export const backupSchema = z.object({
  app: z.literal('crackit'),
  kind: z.literal('progress-backup'),
  exportedAt: iso,
  progress: progressDataSchema,
  settings: settingsBackupSchema.optional(),
})

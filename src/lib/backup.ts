import { migrateProgress, ProgressVersionError, type ProgressData } from './progressModel'
import type { SettingsData } from '../state/settings'

export interface Backup {
  app: 'crackit'
  kind: 'progress-backup'
  exportedAt: string
  progress: ProgressData
  settings?: SettingsData
}

export function createBackup(progress: ProgressData, settings: SettingsData, now = new Date()): Backup {
  return { app: 'crackit', kind: 'progress-backup', exportedAt: now.toISOString(), progress, settings }
}

export function backupFileName(now = new Date()): string {
  return `crackit-progress-${now.toISOString().slice(0, 10)}.json`
}

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string }

/**
 * Parses and validates a backup file's text. Nothing is written here: the caller
 * shows a summary and asks for confirmation before replacing anything.
 */
export async function parseBackup(text: string): Promise<ParseResult> {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (typeof data !== 'object' || data === null || (data as { app?: unknown }).app !== 'crackit')
    return { ok: false, error: 'That file is not a crackIT progress backup.' }

  const raw = data as Record<string, unknown>
  let progress: unknown
  try {
    progress = migrateProgress(raw.progress)
  } catch (e) {
    if (e instanceof ProgressVersionError) return { ok: false, error: e.message }
    throw e
  }

  // Zod is only needed here, so it is loaded on demand and kept out of the main bundle.
  const { backupSchema } = await import('./progressSchema')
  const result = backupSchema.safeParse({ ...raw, progress })
  if (!result.success) {
    const issue = result.error.issues[0]!
    return { ok: false, error: `The backup did not pass validation (${issue.path.join('.') || 'file'}: ${issue.message}).` }
  }
  return { ok: true, backup: result.data as Backup }
}

export function summariseBackup(b: Backup): { topicsStarted: number; reviewCards: number; exportedAt: string } {
  return {
    topicsStarted: Object.keys(b.progress.topics).length,
    reviewCards: Object.keys(b.progress.review.cards).length,
    exportedAt: b.exportedAt,
  }
}

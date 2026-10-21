import { beforeEach, describe, expect, it } from 'vitest'
import { checksPassMark, masteryOf, migrateProgress, ProgressVersionError } from '../src/lib/progressModel'
import { createBackup, parseBackup } from '../src/lib/backup'
import { snapshot, useProgress } from '../src/state/progress'

const ref = { moduleId: 'dsa', topicId: 'big-o' }
const t0 = new Date('2026-01-01T10:00:00Z')
const settings = { theme: 'dark' as const, reducedMotion: true, focusTimerMinutes: 25, snippetLanguage: 'py' as const }

const topic = () => useProgress.getState().topics['dsa/big-o']

beforeEach(() => useProgress.getState().resetAll())

describe('progress store', () => {
  it('records a visit without granting any mastery', () => {
    useProgress.getState().visitLesson(ref, t0)
    expect(masteryOf(topic())).toBe('learning')
    expect(useProgress.getState().lastLesson).toEqual(ref)
  })

  it('only counts a check as passed if answered correctly before revealing', () => {
    const s = useProgress.getState()
    s.recordCheck(ref, 'a', 'wrong', false, t0)
    s.recordCheck(ref, 'a', 'right', true, t0)
    s.revealCheck(ref, 'b', t0)
    s.recordCheck(ref, 'b', 'right', true, t0)
    expect(topic()!.checks.a!.passedAt).toBe(t0.toISOString())
    expect(topic()!.checks.a!.attempts).toBe(2)
    expect(topic()!.checks.b!.correct).toBe(true)
    expect(topic()!.checks.b!.passedAt).toBeUndefined()
  })

  it('keeps the furthest stage when going back', () => {
    const s = useProgress.getState()
    s.reachStage(ref, 'checks', t0)
    s.reachStage(ref, 'learn', t0)
    expect(topic()!.furthestStage).toBe('checks')
  })

  it('needs checks, explain-back and a delayed re-check to be solid', () => {
    const s = useProgress.getState()
    s.markChecksPassed(ref, t0)
    expect(masteryOf(topic())).toBe('learning')
    s.saveExplainBack(ref, { text: 'x', covered: ['a', 'b'] }, true, t0)
    expect(masteryOf(topic())).toBe('awaiting-recheck')
    // A later weaker explain-back does not undo the pass.
    s.saveExplainBack(ref, { text: 'y', covered: [] }, false, t0)
    expect(masteryOf(topic())).toBe('awaiting-recheck')
    useProgress.setState((st) => ({
      topics: { ...st.topics, 'dsa/big-o': { ...st.topics['dsa/big-o']!, recheckPassedAt: t0.toISOString() } },
    }))
    expect(masteryOf(topic())).toBe('solid')
  })

  it('needs 80% of checks, rounded up', () => {
    expect(checksPassMark(10)).toBe(8)
    expect(checksPassMark(4)).toBe(4)
    expect(checksPassMark(6)).toBe(5)
  })
})

describe('export and import', () => {
  function populate() {
    const s = useProgress.getState()
    s.visitLesson(ref, t0)
    s.saveRecall(ref, 'r1', 'my guess', t0)
    s.recordCheck(ref, 'a', 'O(n)', true, t0)
    s.showCheckHint(ref, 'b', t0)
    s.saveExplainBack(ref, { text: 'explained', covered: ['x'] }, false, t0)
    s.updateHandsOn(ref, { attempt: 'code', triedAt: t0.toISOString(), revealed: true, selfCheck: [0, 2] }, t0)
    useProgress.setState({
      review: { cards: { 'dsa/big-o#a': { id: 'dsa/big-o#a', box: 2, due: '2026-01-04T00:00:00.000Z', reviews: 3, lapses: 1, lastReviewedAt: t0.toISOString() } } },
    })
  }

  it('restores progress exactly, including the review schedule', async () => {
    populate()
    const before = JSON.parse(JSON.stringify(snapshot(useProgress.getState())))
    const file = JSON.stringify(createBackup(snapshot(useProgress.getState()), settings, t0))

    useProgress.getState().resetAll()
    expect(Object.keys(useProgress.getState().topics)).toHaveLength(0)

    const parsed = await parseBackup(file)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    useProgress.getState().replaceAll(parsed.backup.progress)
    expect(JSON.parse(JSON.stringify(snapshot(useProgress.getState())))).toEqual(before)
    expect(parsed.backup.settings).toEqual(settings)
  })

  it('rejects files that are not backups, without touching progress', async () => {
    populate()
    const before = snapshot(useProgress.getState())
    expect((await parseBackup('not json')).ok).toBe(false)
    expect((await parseBackup('{"hello":1}')).ok).toBe(false)
    const broken = createBackup(before, settings, t0) as unknown as { progress: { topics: Record<string, unknown> } }
    broken.progress.topics['dsa/big-o'] = { startedAt: 'yesterday' }
    expect((await parseBackup(JSON.stringify(broken))).ok).toBe(false)
    expect(snapshot(useProgress.getState())).toEqual(before)
  })

  it('refuses files from a newer schema version', async () => {
    const future = { ...createBackup(snapshot(useProgress.getState()), settings, t0), progress: { schemaVersion: 99 } }
    const result = await parseBackup(JSON.stringify(future))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/newer version/)
  })
})

describe('migrateProgress', () => {
  it('passes current data through unchanged', () => {
    const data = { schemaVersion: 1, topics: {}, review: { cards: {} } }
    expect(migrateProgress(data)).toEqual(data)
  })
  it('throws on a version it cannot migrate', () => {
    expect(() => migrateProgress({ schemaVersion: 7 })).toThrow(ProgressVersionError)
    expect(() => migrateProgress({ topics: {} })).toThrow(ProgressVersionError)
  })
})

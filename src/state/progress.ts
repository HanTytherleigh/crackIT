import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import {
  emptyProgress,
  lessonStages,
  migrateProgress,
  PROGRESS_SCHEMA_VERSION,
  topicKey,
  type CheckRecord,
  type ExplainBackRecord,
  type HandsOnRecord,
  type LessonStage,
  type ProgressData,
  type TopicProgress,
} from '../lib/progressModel'
import { checkCardId, newCard, reviewCard, type Grade } from '../lib/scheduler'

type Ref = { moduleId: string; topicId: string }

interface ProgressActions {
  /** Records a lesson visit and returns nothing; mastery never comes from visiting. */
  visitLesson: (ref: Ref, now?: Date) => void
  reachStage: (ref: Ref, stage: LessonStage, now?: Date) => void
  saveRecall: (ref: Ref, promptId: string, text: string, now?: Date) => void
  recordCheck: (ref: Ref, checkId: string, answer: string, correct: boolean, now?: Date) => void
  revealCheck: (ref: Ref, checkId: string, now?: Date) => void
  showCheckHint: (ref: Ref, checkId: string, now?: Date) => void
  saveExplainBack: (ref: Ref, record: Omit<ExplainBackRecord, 'submittedAt'>, passed: boolean, now?: Date) => void
  updateHandsOn: (ref: Ref, patch: Partial<HandsOnRecord>, now?: Date) => void
  markChecksPassed: (ref: Ref, now?: Date) => void
  /** Reschedules a review card after it is answered in the Review queue. */
  recordReview: (cardId: string, grade: Grade, now?: Date) => void
  /** Adds a review card if it doesn't exist yet (used by the pattern drills). */
  ensureCard: (cardId: string, now?: Date) => void
  markRecheckPassed: (ref: Ref, now?: Date) => void
  markExported: (now?: Date) => void
  replaceAll: (data: ProgressData) => void
  resetAll: () => void
}

export type ProgressStore = ProgressData & ProgressActions

function freshTopic(now: Date): TopicProgress {
  const t = now.toISOString()
  return { startedAt: t, updatedAt: t, furthestStage: 'recall', recall: {}, checks: {}, checkHints: {} }
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => {
      /** Applies a change to one topic, creating its record if needed. */
      const patchTopic = (ref: Ref, now: Date, fn: (t: TopicProgress) => Partial<TopicProgress>) => {
        const key = topicKey(ref.moduleId, ref.topicId)
        const current = get().topics[key] ?? freshTopic(now)
        set({
          topics: { ...get().topics, [key]: { ...current, ...fn(current), updatedAt: now.toISOString() } },
        })
      }

      return {
        ...emptyProgress(),

        visitLesson: (ref, now = new Date()) => {
          patchTopic(ref, now, () => ({}))
          set({ lastLesson: { moduleId: ref.moduleId, topicId: ref.topicId } })
        },

        reachStage: (ref, stage, now = new Date()) =>
          patchTopic(ref, now, (t) =>
            lessonStages.indexOf(stage) > lessonStages.indexOf(t.furthestStage) ? { furthestStage: stage } : {},
          ),

        saveRecall: (ref, promptId, text, now = new Date()) =>
          patchTopic(ref, now, (t) => ({ recall: { ...t.recall, [promptId]: text } })),

        recordCheck: (ref, checkId, answer, correct, now = new Date()) => {
          // Every check you attempt becomes a review card, first due tomorrow.
          const cardId = checkCardId(ref.moduleId, ref.topicId, checkId)
          if (!get().review.cards[cardId])
            set({ review: { cards: { ...get().review.cards, [cardId]: newCard(cardId, now) } } })
          patchTopic(ref, now, (t) => {
            const prev: CheckRecord = t.checks[checkId] ?? { attempts: 0, lastAnswer: '', correct: false, revealed: false }
            const next: CheckRecord = {
              ...prev,
              attempts: prev.attempts + 1,
              lastAnswer: answer,
              correct,
              // Only a correct answer given before the reveal counts as a pass.
              passedAt: prev.passedAt ?? (correct && !prev.revealed ? now.toISOString() : undefined),
            }
            return { checks: { ...t.checks, [checkId]: next } }
          })
        },

        revealCheck: (ref, checkId, now = new Date()) =>
          patchTopic(ref, now, (t) => {
            const prev = t.checks[checkId] ?? { attempts: 0, lastAnswer: '', correct: false, revealed: false }
            return { checks: { ...t.checks, [checkId]: { ...prev, revealed: true } } }
          }),

        showCheckHint: (ref, checkId, now = new Date()) =>
          patchTopic(ref, now, (t) => ({ checkHints: { ...t.checkHints, [checkId]: (t.checkHints[checkId] ?? 0) + 1 } })),

        saveExplainBack: (ref, record, passed, now = new Date()) =>
          patchTopic(ref, now, (t) => ({
            explainBack: { ...record, submittedAt: now.toISOString() },
            // Once passed it stays passed; a later weaker attempt doesn't undo it.
            explainBackPassedAt: t.explainBackPassedAt ?? (passed ? now.toISOString() : undefined),
          })),

        updateHandsOn: (ref, patch, now = new Date()) =>
          patchTopic(ref, now, (t) => ({
            handsOn: { attempt: '', hintsShown: 0, revealed: false, selfCheck: [], ...t.handsOn, ...patch },
          })),

        markChecksPassed: (ref, now = new Date()) =>
          patchTopic(ref, now, (t) => ({ checksPassedAt: t.checksPassedAt ?? now.toISOString() })),

        recordReview: (cardId, grade, now = new Date()) => {
          const card = get().review.cards[cardId]
          if (!card) return
          set({ review: { cards: { ...get().review.cards, [cardId]: reviewCard(card, grade, now) } } })
        },

        ensureCard: (cardId, now = new Date()) => {
          if (get().review.cards[cardId]) return
          set({ review: { cards: { ...get().review.cards, [cardId]: newCard(cardId, now) } } })
        },

        markRecheckPassed: (ref, now = new Date()) =>
          patchTopic(ref, now, (t) => ({ recheckPassedAt: t.recheckPassedAt ?? now.toISOString() })),

        markExported: (now = new Date()) => set({ lastExportedAt: now.toISOString() }),

        replaceAll: (data) => set({ ...emptyProgress(), lastLesson: undefined, lastExportedAt: undefined, ...data }),

        resetAll: () => set({ ...emptyProgress(), lastLesson: undefined, lastExportedAt: undefined }),
      }
    },
    {
      name: 'crackit.progress',
      version: PROGRESS_SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => snapshot(s),
      migrate: (persisted) => migrateProgress(persisted) as ProgressData,
    },
  ),
)

/** The plain data part of the store, as saved and exported. */
export function snapshot(s: ProgressData): ProgressData {
  const data: ProgressData = { schemaVersion: s.schemaVersion, topics: s.topics, review: s.review }
  if (s.lastLesson) data.lastLesson = s.lastLesson
  if (s.lastExportedAt) data.lastExportedAt = s.lastExportedAt
  return data
}

export function useTopicProgress(moduleId: string, topicId: string): TopicProgress | undefined {
  return useProgress((s) => s.topics[topicKey(moduleId, topicId)])
}

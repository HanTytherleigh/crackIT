import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getModule } from '../content/modules'
import { loadTopic } from '../content/topics'
import type { Check, Topic } from '../content/schema'
import { masteryOf, recheckPassed, topicKey, type CheckRecord } from '../lib/progressModel'
import { dueCards, interleave, nextDue, parseCheckCardId, SESSION_LIMIT, type Grade } from '../lib/scheduler'
import { useProgress } from '../state/progress'
import { CheckCard } from '../lesson/CheckCard'

type Item = { cardId: string; moduleId: string; topicId: string; check: Check; topic: Topic; retry: boolean }
type Answer = { record: CheckRecord; hints: number }

const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export function describeDay(date: Date, now = new Date()): string {
  const days = Math.round((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return dayFmt.format(date)
}

export function ReviewScreen() {
  const [session, setSession] = useState<{ status: 'loading' } | { status: 'ready'; items: Item[] }>({ status: 'loading' })

  // Snapshot the due cards once, so answering doesn't reshuffle the session under you.
  useEffect(() => {
    let live = true
    buildSession().then((items) => live && setSession({ status: 'ready', items }))
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="page">
      <h1>Review</h1>
      {session.status === 'loading' && <p className="muted" role="status">Gathering today's questions…</p>}
      {session.status === 'ready' &&
        (session.items.length === 0 ? <NothingDue /> : <Session initial={session.items} />)}
    </div>
  )
}

async function buildSession(now = new Date()): Promise<Item[]> {
  const cards = useProgress.getState().review.cards
  const due = interleave(dueCards(cards, now), (c) => c.id.split('#')[0]!).slice(0, SESSION_LIMIT)

  // Load each topic file once. Cards whose question no longer exists in the content are skipped.
  const topics = new Map<string, Promise<Topic | undefined>>()
  const items: Item[] = []
  for (const card of due) {
    const ref = parseCheckCardId(card.id)
    if (!ref) continue
    const key = topicKey(ref.moduleId, ref.topicId)
    if (!topics.has(key)) {
      const file = getModule(ref.moduleId)?.topics.find((t) => t.id === ref.topicId)?.file
      topics.set(key, file ? loadTopic(ref.moduleId, file).catch(() => undefined) : Promise.resolve(undefined))
    }
    const topic = await topics.get(key)!
    const check = topic?.checks.find((c) => c.id === ref.checkId)
    if (topic && check) items.push({ cardId: card.id, moduleId: ref.moduleId, topicId: ref.topicId, check, topic, retry: false })
  }
  return items
}

function NothingDue() {
  const cards = useProgress((s) => s.review.cards)
  const upcoming = nextDue(cards, new Date())
  return (
    <div className="card empty">
      {upcoming ? (
        <>
          <p>Nothing is due right now.</p>
          <p>
            Next review: <strong>{describeDay(upcoming.date)}</strong>, {upcoming.count} {upcoming.count === 1 ? 'question' : 'questions'}.
          </p>
        </>
      ) : (
        <>
          <p>Nothing to review yet.</p>
          <p>Answer the checks in a lesson and they will come back here, starting the next day.</p>
        </>
      )}
      <Link to="/learn" className="btn">Go to lessons</Link>
    </div>
  )
}

function gradeOf(a: Answer): Grade {
  if (!a.record.passedAt) return 'again'
  return a.record.attempts === 1 && a.hints === 0 ? 'good' : 'hard'
}

function Session({ initial }: { initial: Item[] }) {
  const recordReview = useProgress((s) => s.recordReview)
  const markRecheckPassed = useProgress((s) => s.markRecheckPassed)
  const [queue, setQueue] = useState(initial)
  const [pos, setPos] = useState(0)
  const [answers, setAnswers] = useState<Record<number, Answer>>({})
  const [grades, setGrades] = useState<Record<string, Grade>>({})
  const [newlySolid, setNewlySolid] = useState<string[]>([])
  const nextRef = useRef<HTMLButtonElement>(null)

  const item = queue[pos]
  const answer = answers[pos] ?? { record: { attempts: 0, lastAnswer: '', correct: false, revealed: false }, hints: 0 }
  const finished = answer.record.correct || answer.record.revealed

  // Grade the first time each card is finished, then focus "Next" for keyboard users.
  useEffect(() => {
    if (!item || !finished) return
    nextRef.current?.focus()
    if (item.retry || grades[item.cardId]) return
    const grade = gradeOf(answer)
    setGrades((g) => ({ ...g, [item.cardId]: grade }))
    recordReview(item.cardId, grade)
    if (grade === 'again') setQueue((q) => [...q, { ...item, retry: true }])

    const state = useProgress.getState()
    const key = topicKey(item.moduleId, item.topicId)
    const tp = state.topics[key]
    const topicCards = Object.values(state.review.cards).filter((c) => c.id.startsWith(`${key}#`))
    if (!tp?.recheckPassedAt && recheckPassed(tp, topicCards, item.topic.checks.length)) {
      markRecheckPassed({ moduleId: item.moduleId, topicId: item.topicId })
      if (masteryOf(useProgress.getState().topics[key]) === 'solid') setNewlySolid((s) => [...s, item.topic.title])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, pos])

  function update(patch: (a: Answer) => Answer) {
    setAnswers((all) => ({ ...all, [pos]: patch(answer) }))
  }

  if (!item) return <Summary grades={grades} newlySolid={newlySolid} />

  return (
    <div className="stack-lg">
      <div className="review-progress">
        <span>{pos + 1} of {queue.length}</span>
        <div className="review-bar" aria-hidden="true">
          <div style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
      </div>
      {item.retry && <p className="muted small">One more try at this one. It won't change its schedule.</p>}

      <CheckCard
        key={pos}
        check={item.check}
        index={0}
        label={item.topic.title}
        record={answer.record}
        hintsShown={answer.hints}
        revealedNote="It will come back again soon."
        onAnswer={(value, correct) =>
          update((a) => ({
            ...a,
            record: {
              ...a.record,
              attempts: a.record.attempts + 1,
              lastAnswer: value,
              correct,
              passedAt: a.record.passedAt ?? (correct && !a.record.revealed ? new Date().toISOString() : undefined),
            },
          }))
        }
        onReveal={() => update((a) => ({ ...a, record: { ...a.record, revealed: true } }))}
        onHint={() => update((a) => ({ ...a, hints: a.hints + 1 }))}
      />

      {finished && (
        <div className="lesson-nav">
          <span />
          <button ref={nextRef} type="button" className="btn btn-primary" onClick={() => { setPos(pos + 1); window.scrollTo(0, 0) }}>
            {pos + 1 < queue.length ? 'Next question' : 'Finish'}
          </button>
        </div>
      )}
    </div>
  )
}

function Summary({ grades, newlySolid }: { grades: Record<string, Grade>; newlySolid: string[] }) {
  const cards = useProgress((s) => s.review.cards)
  const all = Object.values(grades)
  const good = all.filter((g) => g === 'good').length
  const hard = all.filter((g) => g === 'hard').length
  const again = all.filter((g) => g === 'again').length
  const upcoming = nextDue(cards, new Date())

  return (
    <div className="card stack" role="status">
      <h2>Session done</h2>
      <p>
        You reviewed {all.length} {all.length === 1 ? 'question' : 'questions'}: {good} straight away, {hard} with some help, and {again} to look at again soon.
      </p>
      {newlySolid.length > 0 && (
        <p><strong>Now solid:</strong> {newlySolid.join(', ')}.</p>
      )}
      <p className="muted">
        {upcoming ? `Next review: ${describeDay(upcoming.date)}.` : 'Nothing else is scheduled yet.'} The ones you missed come back sooner, which is how it is meant to work.
      </p>
      <div className="button-row">
        <Link to="/" className="btn btn-primary">Back home</Link>
        <Link to="/progress" className="btn">See progress</Link>
      </div>
    </div>
  )
}

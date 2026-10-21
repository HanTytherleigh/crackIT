import { Link } from 'react-router-dom'
import { ProgressMap } from '../components/ProgressMap'
import { getModule, modules } from '../content/modules'
import { useProgress } from '../state/progress'
import { dueCards, nextDue, SESSION_LIMIT } from '../lib/scheduler'
import { describeDay } from '../lib/dates'

const EXPORT_REMINDER_DAYS = 14

export function HomeScreen() {
  const dsa = modules.find((m) => m.status === 'available')!
  const lastLesson = useProgress((s) => s.lastLesson)
  const lastExportedAt = useProgress((s) => s.lastExportedAt)
  const started = useProgress((s) => Object.keys(s.topics).length)
  const cards = useProgress((s) => s.review.cards)
  const now = new Date()
  const due = dueCards(cards, now).length
  const upcoming = nextDue(cards, now)

  const lastModule = getModule(lastLesson?.moduleId)
  const lastTopic = lastModule?.topics.find((t) => t.id === lastLesson?.topicId)
  const resume = lastModule && lastTopic ? { module: lastModule, topic: lastTopic } : { module: dsa, topic: dsa.topics[0]! }

  const daysSinceExport = lastExportedAt ? (Date.now() - Date.parse(lastExportedAt)) / 86_400_000 : Infinity
  const remindExport = started > 0 && daysSinceExport > EXPORT_REMINDER_DAYS

  return (
    <div className="page">
      <h1>Good to see you</h1>
      <p className="page-lead">A short session is plenty. Recall first, then explain, then practise.</p>

      <section className="card stack" aria-labelledby="review-heading">
        <h2 id="review-heading">Today's review</h2>
        {due > 0 ? (
          <>
            <p>
              <strong>{due}</strong> {due === 1 ? 'question is' : 'questions are'} ready
              {due > SESSION_LIMIT ? `. A session takes up to ${SESSION_LIMIT}, so it's fine to do it in parts.` : '.'}
            </p>
            <Link to="/review" className="btn btn-primary">Start review</Link>
          </>
        ) : upcoming ? (
          <p className="muted">
            All caught up. Next review is {describeDay(upcoming.date, now)}, with {upcoming.count} {upcoming.count === 1 ? 'question' : 'questions'}.
          </p>
        ) : (
          <p className="muted">Nothing is due yet. Questions you answer in lessons come back here on a schedule, just before you would forget them.</p>
        )}
      </section>

      <section className="card stack section-gap" aria-labelledby="continue-heading">
        <h2 id="continue-heading">{lastLesson ? 'Continue where you left off' : 'Start where it begins'}</h2>
        <p>
          <strong>{resume.topic.title}</strong>
          <span className="muted"> · {resume.topic.summary}</span>
        </p>
        <Link to={`/learn/${resume.module.id}/${resume.topic.id}`} className={due > 0 ? 'btn' : 'btn btn-primary'}>
          {lastLesson ? 'Continue lesson' : 'Start lesson'}
        </Link>
      </section>

      {remindExport && (
        <section className="card stack section-gap notice" aria-labelledby="backup-heading">
          <h2 id="backup-heading">Keep a copy of your progress</h2>
          <p className="muted">Your progress lives only on this device, and iOS can clear website data. An occasional export keeps it safe.</p>
          <Link to="/progress" className="btn">Export progress</Link>
        </section>
      )}

      <section className="section-gap" aria-labelledby="map-heading">
        <h2 id="map-heading">Your map</h2>
        <p className="muted">{dsa.title}</p>
        <ProgressMap module={dsa} />
      </section>
    </div>
  )
}

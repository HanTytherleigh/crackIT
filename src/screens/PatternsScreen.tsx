import { Link } from 'react-router-dom'
import { usePatterns } from '../content/patterns'
import { dueCards } from '../lib/scheduler'
import { useProgress } from '../state/progress'
import { ChevronIcon } from '../components/Icons'

const drills = [
  { to: '/patterns/drill/signals', title: 'Signal spotting', blurb: 'Read a problem, pick the pattern, and tick the words that gave it away.' },
  { to: '/patterns/drill/lookalikes', title: 'Pattern versus look-alike', blurb: 'Two similar problems that need different patterns. Explain the difference.' },
  { to: '/patterns/drill/complexity', title: 'Complexity prediction', blurb: 'Predict the Big O of an approach before you see it.' },
]

export function PatternsScreen() {
  const patterns = usePatterns()
  const cards = useProgress((s) => s.review.cards)
  const patternCards = Object.fromEntries(Object.entries(cards).filter(([id]) => id.startsWith('drill:')))
  const due = dueCards(patternCards, new Date()).length

  return (
    <div className="page">
      <h1>Patterns</h1>
      <p className="page-lead">Most interview questions are a handful of patterns in disguise. Learn to spot them from the words in the problem.</p>

      <section aria-labelledby="drills-h">
        <h2 id="drills-h">Drills</h2>
        <ul className="module-list">
          {drills.map((d) => (
            <li key={d.to}>
              <Link to={d.to} className="card module-card">
                <span className="module-body">
                  <span className="module-title">{d.title}</span>
                  <span className="muted">{d.blurb}</span>
                </span>
                <ChevronIcon />
              </Link>
            </li>
          ))}
          <li>
            <Link to="/review?only=patterns" className="card module-card">
              <span className="module-body">
                <span className="module-title">Mixed pattern review</span>
                <span className="muted">Old and new patterns, interleaved on a spaced-repetition schedule.</span>
                {Object.keys(patternCards).length > 0 && <span className="badge">{due} due</span>}
              </span>
              <ChevronIcon />
            </Link>
          </li>
        </ul>
      </section>

      <section className="section-gap" aria-labelledby="catalogue-h">
        <h2 id="catalogue-h">Catalogue</h2>
        {!patterns ? (
          <p className="muted" role="status">Loading patterns…</p>
        ) : (
          <ul className="pattern-grid">
            {patterns.map((p) => (
              <li key={p.id}>
                <Link to={`/patterns/${p.id}`} className="card pattern-card">
                  <span className="module-title">{p.name}</span>
                  <span className="muted small">{p.cue}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

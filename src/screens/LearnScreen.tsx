import { Link } from 'react-router-dom'
import { modules } from '../content/modules'
import { ChevronIcon, LockIcon } from '../components/Icons'

export function LearnScreen() {
  return (
    <div className="page">
      <h1>Learn</h1>
      <p className="page-lead">Focused recaps of what graduate interviews expect. Modules open one at a time.</p>
      <ol className="module-list">
        {modules.map((m, i) =>
          m.status === 'available' ? (
            <li key={m.id}>
              <Link to={`/learn/${m.id}`} className="card module-card">
                <span className="module-num" aria-hidden="true">{i + 1}</span>
                <span className="module-body">
                  <span className="module-title">{m.title}</span>
                  <span className="muted">{m.description}</span>
                  <span className="badge">{m.topics.length} topics</span>
                </span>
                <ChevronIcon />
              </Link>
            </li>
          ) : (
            <li key={m.id}>
              <div className="card module-card locked" aria-label={`${m.title}, locked`}>
                <span className="module-num" aria-hidden="true">{i + 1}</span>
                <span className="module-body">
                  <span className="module-title">{m.title}</span>
                  <span className="muted">{m.description}</span>
                  <span className="module-covers">{m.covers.join(' · ')}</span>
                </span>
                <LockIcon />
              </div>
            </li>
          ),
        )}
      </ol>
    </div>
  )
}

import { Link, useParams } from 'react-router-dom'
import { getModule } from '../content/modules'
import { BackIcon, ChevronIcon } from '../components/Icons'
import { NotFoundScreen } from './NotFoundScreen'
import { dotState } from '../components/ProgressMap'
import { masteryLabel, masteryOf, topicKey } from '../lib/progressModel'
import { useProgress } from '../state/progress'

export function ModuleScreen() {
  const { moduleId } = useParams()
  const module = getModule(moduleId)
  const topics = useProgress((s) => s.topics)
  if (!module || module.status !== 'available') return <NotFoundScreen />

  return (
    <div className="page">
      <Link to="/learn" className="back-link"><BackIcon /> Learn</Link>
      <h1>{module.title}</h1>
      <p className="page-lead">{module.description} Work through them in order: each topic builds on the last.</p>
      <ol className="topic-list">
        {module.topics.map((t, i) => {
          const m = masteryOf(topics[topicKey(module.id, t.id)])
          return (
          <li key={t.id}>
            <Link to={`/learn/${module.id}/${t.id}`} className="topic-row">
              <span className="map-dot" data-state={dotState[m]} aria-hidden="true">{i + 1}</span>
              <span className="topic-body">
                <span className="topic-title">{t.title}</span>
                <span className="muted">{t.summary}</span>
                {!t.file ? <span className="badge">Being written</span> : m !== 'new' && <span className="badge">{masteryLabel[m]}</span>}
              </span>
              <ChevronIcon />
            </Link>
          </li>
          )
        })}
      </ol>
    </div>
  )
}

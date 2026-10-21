import { Link, useParams } from 'react-router-dom'
import { getModule } from '../content/modules'
import { BackIcon, ChevronIcon } from '../components/Icons'
import { NotFoundScreen } from './NotFoundScreen'

export function ModuleScreen() {
  const { moduleId } = useParams()
  const module = getModule(moduleId)
  if (!module || module.status !== 'available') return <NotFoundScreen />

  return (
    <div className="page">
      <Link to="/learn" className="back-link"><BackIcon /> Learn</Link>
      <h1>{module.title}</h1>
      <p className="page-lead">{module.description} Work through them in order: each topic builds on the last.</p>
      <ol className="topic-list">
        {module.topics.map((t, i) => (
          <li key={t.id}>
            <Link to={`/learn/${module.id}/${t.id}`} className="topic-row">
              <span className="map-dot" data-state="new" aria-hidden="true">{i + 1}</span>
              <span className="topic-body">
                <span className="topic-title">{t.title}</span>
                <span className="muted">{t.summary}</span>
              </span>
              <ChevronIcon />
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

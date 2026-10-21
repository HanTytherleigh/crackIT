import { Link, useParams } from 'react-router-dom'
import { getModule } from '../content/modules'
import { BackIcon } from '../components/Icons'
import { NotFoundScreen } from './NotFoundScreen'

export function LessonScreen() {
  const { moduleId, topicId } = useParams()
  const module = getModule(moduleId)
  const topic = module?.topics.find((t) => t.id === topicId)
  if (!module || module.status !== 'available' || !topic) return <NotFoundScreen />

  return (
    <div className="page lesson">
      <Link to={`/learn/${module.id}`} className="back-link"><BackIcon /> {module.title}</Link>
      <h1>{topic.title}</h1>
      <p className="page-lead">{topic.summary}</p>
      <div className="card empty">
        <p>This lesson is being written.</p>
        <p>Lessons open with a few recall questions, then the explanation, widgets, an explain-back, and checks.</p>
      </div>
    </div>
  )
}

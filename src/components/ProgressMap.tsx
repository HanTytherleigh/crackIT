import { Link } from 'react-router-dom'
import type { Module } from '../content/schema'

/** A row of topic dots. Mastery colours arrive with the progress store in phase 2. */
export function ProgressMap({ module }: { module: Module }) {
  return (
    <ol className="progress-map" aria-label={`${module.title} topics`}>
      {module.topics.map((t, i) => (
        <li key={t.id}>
          <Link to={`/learn/${module.id}/${t.id}`} className="map-dot" data-state="new" aria-label={`${i + 1}. ${t.title}: not started`}>
            {i + 1}
          </Link>
        </li>
      ))}
    </ol>
  )
}

import { Link } from 'react-router-dom'
import type { Module } from '../content/schema'
import { masteryLabel, masteryOf, topicKey, type Mastery } from '../lib/progressModel'
import { useProgress } from '../state/progress'

/** Maps mastery onto the dot styles: learning is outlined, solid is filled. */
export const dotState: Record<Mastery, string> = {
  new: 'new',
  learning: 'learning',
  'awaiting-recheck': 'learning',
  solid: 'solid',
}

/** A row of topic dots, coloured by mastery rather than scored. */
export function ProgressMap({ module }: { module: Module }) {
  const topics = useProgress((s) => s.topics)
  return (
    <ol className="progress-map" aria-label={`${module.title} topics`}>
      {module.topics.map((t, i) => {
        const m = masteryOf(topics[topicKey(module.id, t.id)])
        return (
          <li key={t.id}>
            <Link to={`/learn/${module.id}/${t.id}`} className="map-dot" data-state={dotState[m]} aria-label={`${i + 1}. ${t.title}: ${masteryLabel[m]}`}>
              {i + 1}
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

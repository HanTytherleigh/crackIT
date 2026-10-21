import { useEffect, useState } from 'react'
import { getModule } from './modules'
import type { Topic } from './schema'

// Each topic file becomes its own lazily loaded chunk. The files are validated at
// build time (scripts/validate-content.ts), so they are trusted here.
const topicFiles = import.meta.glob<Topic>('../../content/*/*.json', { import: 'default' })

export function loadTopic(moduleId: string, file: string): Promise<Topic> {
  const loader = topicFiles[`../../content/${moduleId}/${file}`]
  if (!loader) return Promise.reject(new Error(`No content file ${moduleId}/${file}`))
  return loader()
}

export type TopicState =
  | { status: 'loading' }
  | { status: 'unwritten' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; topic: Topic }

export function useTopic(moduleId: string | undefined, topicId: string | undefined): TopicState {
  const module = getModule(moduleId)
  const ref = module?.status === 'available' ? module.topics.find((t) => t.id === topicId) : undefined
  const [state, setState] = useState<TopicState>({ status: 'loading' })

  useEffect(() => {
    if (!module || !ref) return setState({ status: 'missing' })
    if (!ref.file) return setState({ status: 'unwritten' })
    let cancelled = false
    setState({ status: 'loading' })
    loadTopic(module.id, ref.file).then(
      (topic) => !cancelled && setState({ status: 'ready', topic }),
      (e: Error) => !cancelled && setState({ status: 'error', message: e.message }),
    )
    return () => {
      cancelled = true
    }
  }, [module, ref])

  return state
}

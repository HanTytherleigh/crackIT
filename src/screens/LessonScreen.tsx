import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getModule } from '../content/modules'
import { useTopic } from '../content/topics'
import { lessonStages, type LessonStage } from '../lib/progressModel'
import { useProgress, useTopicProgress } from '../state/progress'
import { BackIcon } from '../components/Icons'
import { FocusTimer } from '../components/FocusTimer'
import {
  ChecksStage,
  ExplainStage,
  HandsOnStage,
  LearnStage,
  RecallStage,
  recallComplete,
  WrapUpStage,
  type StageProps,
} from '../lesson/stages'
import { NotFoundScreen } from './NotFoundScreen'

const stageInfo: Record<LessonStage, { label: string; Component: (p: StageProps) => React.ReactNode }> = {
  recall: { label: 'Recall', Component: RecallStage },
  learn: { label: 'Learn', Component: LearnStage },
  explain: { label: 'Explain back', Component: ExplainStage },
  checks: { label: 'Checks', Component: ChecksStage },
  'hands-on': { label: 'Hands-on', Component: HandsOnStage },
  'wrap-up': { label: 'Wrap-up', Component: WrapUpStage },
}

export function LessonScreen() {
  const { moduleId = '', topicId = '' } = useParams()
  const module = getModule(moduleId)
  const ref = module?.topics.find((t) => t.id === topicId)
  const state = useTopic(moduleId, topicId)

  if (state.status === 'missing') return <NotFoundScreen />
  return (
    <div className="page lesson">
      <div className="lesson-bar">
        <Link to={`/learn/${moduleId}`} className="back-link"><BackIcon /> <span>Exit lesson</span></Link>
        <FocusTimer />
      </div>
      <h1>{ref?.title}</h1>
      {state.status === 'loading' && <p className="muted" role="status">Loading the lesson…</p>}
      {state.status === 'error' && <p role="alert">This lesson could not be loaded. {state.message}</p>}
      {state.status === 'unwritten' && (
        <div className="card empty">
          <p>This lesson is being written.</p>
          <p>It will open with a few recall questions, then the explanation, widgets, an explain-back and checks.</p>
        </div>
      )}
      {state.status === 'ready' && <LessonFlow topic={state.topic} />}
    </div>
  )
}

function LessonFlow({ topic }: { topic: StageProps['topic'] }) {
  const refs = useMemo(() => ({ moduleId: topic.moduleId, topicId: topic.id }), [topic])
  const progress = useTopicProgress(topic.moduleId, topic.id)
  const visitLesson = useProgress((s) => s.visitLesson)
  const reachStage = useProgress((s) => s.reachStage)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Resume at the furthest stage reached, so returning drops you back where you were.
  const [stage, setStage] = useState<LessonStage>(() => progress?.furthestStage ?? 'recall')
  const index = lessonStages.indexOf(stage)
  const furthest = lessonStages.indexOf(progress?.furthestStage ?? 'recall')

  useEffect(() => visitLesson(refs), [refs, visitLesson])

  function go(next: LessonStage) {
    reachStage(refs, next)
    setStage(next)
    window.scrollTo(0, 0)
    // Move focus to the new stage heading so screen readers announce it.
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  const canContinue = stage !== 'recall' || recallComplete(topic, progress)
  const nextStage = lessonStages[index + 1]
  const prevStage = lessonStages[index - 1]
  const { Component, label } = stageInfo[stage]

  return (
    <>
      <nav aria-label="Lesson steps" className="stepper">
        <ol>
          {lessonStages.map((s, i) => {
            const reachable = i <= Math.max(furthest, index)
            return (
              <li key={s}>
                <button
                  type="button"
                  className="step"
                  data-state={i === index ? 'current' : i < Math.max(furthest, index) ? 'done' : 'todo'}
                  aria-current={i === index ? 'step' : undefined}
                  disabled={!reachable}
                  onClick={() => go(s)}
                  aria-label={`${i + 1}. ${stageInfo[s].label}${reachable ? '' : ' (not reached yet)'}`}
                >
                  <span aria-hidden="true">{i + 1}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <h2 className="stage-title" tabIndex={-1} ref={headingRef}>
        <span className="muted">Step {index + 1} of {lessonStages.length}:</span> {label}
      </h2>

      <Component topic={topic} progress={progress} refs={refs} />

      <div className="lesson-nav">
        {prevStage ? (
          <button type="button" className="btn" onClick={() => go(prevStage)}>Back</button>
        ) : (
          <span />
        )}
        {nextStage ? (
          <button type="button" className="btn btn-primary" disabled={!canContinue} onClick={() => go(nextStage)}>
            {stage === 'recall' ? 'Show me the explanation' : `Continue to ${stageInfo[nextStage].label.toLowerCase()}`}
          </button>
        ) : (
          <Link to={`/learn/${topic.moduleId}`} className="btn btn-primary">Back to topics</Link>
        )}
      </div>
      {!canContinue && <p className="muted small lesson-nav-hint">Answer each recall question, even with a guess, to continue.</p>}
    </>
  )
}

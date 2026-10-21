import { useEffect, useId, useState } from 'react'
import type { Topic } from '../content/schema'
import { explainBackPassMark } from '../content/rules'
import { checksPassMark, type TopicProgress } from '../lib/progressModel'
import { useProgress } from '../state/progress'
import { CodeBlock } from '../components/CodeBlock'
import { HintLadder } from '../components/HintLadder'
import { Prose } from '../components/Prose'
import { WidgetSlot } from '../components/WidgetSlot'
import { CheckCard } from './CheckCard'

export type StageProps = {
  topic: Topic
  progress: TopicProgress | undefined
  refs: { moduleId: string; topicId: string }
}

const NOT_SURE = "I'm not sure yet."

/** Retrieval before explanation: write what you think now, then see the lesson. */
export function RecallStage({ topic, progress, refs }: StageProps) {
  const saveRecall = useProgress((s) => s.saveRecall)
  return (
    <div className="stack-lg">
      <p className="lead">Before any explanation, write what you think now. Guesses are fine: trying to recall is what makes it stick.</p>
      {topic.recallPrompts.map((r, i) => (
        <div key={r.id} className="card">
          <label htmlFor={`recall-${r.id}`} className="field-label">
            <span className="check-num">Recall {i + 1}</span>
            <Prose text={r.prompt} />
          </label>
          <textarea
            id={`recall-${r.id}`}
            className="textarea"
            rows={3}
            value={progress?.recall[r.id] ?? ''}
            onChange={(e) => saveRecall(refs, r.id, e.target.value)}
          />
          {!progress?.recall[r.id]?.trim() && (
            <button type="button" className="btn btn-quiet" onClick={() => saveRecall(refs, r.id, NOT_SURE)}>
              I'm not sure yet
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function recallComplete(topic: Topic, progress: TopicProgress | undefined): boolean {
  return topic.recallPrompts.every((r) => (progress?.recall[r.id] ?? '').trim() !== '')
}

export function LearnStage({ topic, progress }: StageProps) {
  return (
    <div className="stack-lg">
      <details className="card recall-compare">
        <summary>Compare with what you wrote</summary>
        <dl>
          {topic.recallPrompts.map((r) => (
            <div key={r.id}>
              <dt><Prose text={r.prompt} /></dt>
              <dd>{progress?.recall[r.id] || <span className="muted">Nothing written.</span>}</dd>
            </div>
          ))}
        </dl>
      </details>

      <aside className="analogy" aria-label="Mental model">
        <Prose text={topic.mentalModel.analogy} />
      </aside>

      {topic.mentalModel.sections.map((s) => (
        <section key={s.id} className="lesson-section" aria-labelledby={`sec-${s.id}`}>
          <h2 id={`sec-${s.id}`}>{s.heading}</h2>
          <Prose text={s.body} />
          {s.widget && <WidgetSlot id={s.widget} />}
          {s.code && <CodeBlock snippet={s.code} />}
        </section>
      ))}
    </div>
  )
}

/** Explain it back in your own words, then self-assess against the rubric. */
export function ExplainStage({ topic, progress, refs }: StageProps) {
  const saveExplainBack = useProgress((s) => s.saveExplainBack)
  const id = useId()
  const saved = progress?.explainBack
  const [text, setText] = useState(saved?.text ?? '')
  const [showRubric, setShowRubric] = useState(!!saved)
  const [covered, setCovered] = useState<string[]>(saved?.covered ?? [])
  const passMark = explainBackPassMark(topic)
  const rubric = topic.explainBack.rubric
  const savedPassed = !!progress?.explainBackPassedAt

  function toggle(pointId: string) {
    setCovered((c) => (c.includes(pointId) ? c.filter((x) => x !== pointId) : [...c, pointId]))
  }

  function save() {
    saveExplainBack(refs, { text, covered }, covered.length >= passMark)
  }

  return (
    <div className="stack-lg">
      <div className="card">
        <label htmlFor={`${id}-text`} className="field-label">
          <Prose text={topic.explainBack.prompt} />
        </label>
        <textarea
          id={`${id}-text`}
          className="textarea"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write it as if you were explaining it in an interview."
        />
        {!showRubric && (
          <button type="button" className="btn btn-primary" disabled={text.trim().length < 20} onClick={() => setShowRubric(true)}>
            I've written it, show the checklist
          </button>
        )}
      </div>

      {showRubric && (
        <fieldset className="card rubric">
          <legend>Tick each point your explanation covered</legend>
          <p className="muted small">Be honest: this is for you. You need {passMark} of {rubric.length} to pass.</p>
          {rubric.map((r) => (
            <label key={r.id} className="check-row">
              <input type="checkbox" checked={covered.includes(r.id)} onChange={() => toggle(r.id)} />
              <span>{r.point}</span>
            </label>
          ))}
          <button type="button" className="btn btn-primary" onClick={save}>Save my self-check</button>
          <p role="status" className="small">
            {saved &&
              (savedPassed
                ? `Saved. You covered ${saved.covered.length} of ${rubric.length}, which is a pass.`
                : `Saved. You covered ${saved.covered.length} of ${rubric.length}. Reread the sections you missed, then rewrite and tick again.`)}
          </p>
        </fieldset>
      )}
    </div>
  )
}

export function ChecksStage({ topic, progress, refs }: StageProps) {
  const recordCheck = useProgress((s) => s.recordCheck)
  const revealCheck = useProgress((s) => s.revealCheck)
  const showCheckHint = useProgress((s) => s.showCheckHint)
  const markChecksPassed = useProgress((s) => s.markChecksPassed)
  const passed = topic.checks.filter((c) => progress?.checks[c.id]?.passedAt).length
  const mark = checksPassMark(topic.checks.length)

  const alreadyMarked = !!progress?.checksPassedAt
  useEffect(() => {
    if (passed >= mark && !alreadyMarked) markChecksPassed(refs)
  }, [passed, mark, alreadyMarked, markChecksPassed, refs])

  return (
    <div className="stack-lg">
      <p className="lead">
        Answer before you look anything up. Pass {mark} of {topic.checks.length} without revealing the answer to clear this step.
      </p>
      <p className="tally" aria-live="polite">Passed {passed} of {topic.checks.length}</p>
      {topic.checks.map((c, i) => (
        <CheckCard
          key={c.id}
          check={c}
          index={i}
          record={progress?.checks[c.id]}
          hintsShown={progress?.checkHints[c.id] ?? 0}
          onAnswer={(v, ok) => recordCheck(refs, c.id, v, ok)}
          onReveal={() => revealCheck(refs, c.id)}
          onHint={() => showCheckHint(refs, c.id)}
        />
      ))}
    </div>
  )
}

/** Implement it yourself. The reference stays behind a deliberate "I tried it" gate. */
export function HandsOnStage({ topic, progress, refs }: StageProps) {
  const update = useProgress((s) => s.updateHandsOn)
  const h = topic.handsOn
  const rec = progress?.handsOn
  const tried = !!rec?.triedAt
  const id = useId()

  return (
    <div className="stack-lg">
      <div className="card">
        <Prose text={h.prompt} />
        {h.starter && <CodeBlock snippet={h.starter} label="Starter" />}
        <label htmlFor={`${id}-code`} className="field-label">Your attempt (code, pseudocode or notes)</label>
        <textarea
          id={`${id}-code`}
          className="textarea mono"
          rows={10}
          spellCheck={false}
          autoCapitalize="off"
          value={rec?.attempt ?? ''}
          onChange={(e) => update(refs, { attempt: e.target.value })}
        />
        <p className="muted small">Working it out on paper or in your own editor counts too.</p>
        {!tried && (
          <button type="button" className="btn btn-primary" onClick={() => update(refs, { triedAt: new Date().toISOString() })}>
            I tried it
          </button>
        )}
      </div>

      {tried && (
        <div className="card stack">
          <HintLadder hints={h.hints} shown={rec?.hintsShown ?? 0} unlocked={tried} onShowNext={() => update(refs, { hintsShown: (rec?.hintsShown ?? 0) + 1 })} />
          {!rec?.revealed ? (
            <button type="button" className="btn" onClick={() => update(refs, { revealed: true })}>Show the reference answer</button>
          ) : (
            <>
              <h2>Reference answer</h2>
              <CodeBlock snippet={h.reference} />
              <Prose text={h.explanation} />
              <fieldset className="rubric">
                <legend>Check your own attempt</legend>
                {h.selfCheck.map((item, i) => (
                  <label key={i} className="check-row">
                    <input
                      type="checkbox"
                      checked={rec.selfCheck.includes(i)}
                      onChange={() =>
                        update(refs, {
                          selfCheck: rec.selfCheck.includes(i) ? rec.selfCheck.filter((x) => x !== i) : [...rec.selfCheck, i],
                        })
                      }
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function WrapUpStage({ topic, progress }: StageProps) {
  const passed = topic.checks.filter((c) => progress?.checks[c.id]?.passedAt).length
  const mark = checksPassMark(topic.checks.length)
  const explained = !!progress?.explainBackPassedAt

  return (
    <div className="stack-lg">
      <section className="card stack" aria-labelledby="mistakes-h">
        <h2 id="mistakes-h">Common mistakes</h2>
        <ul className="mistakes">
          {topic.commonMistakes.map((m, i) => (
            <li key={i}>
              <Prose text={m.mistake} className="mistake" />
              <Prose text={m.fix} className="fix" />
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack" aria-labelledby="where-h">
        <h2 id="where-h">Where you are</h2>
        <ul className="status-list">
          <li data-done={passed >= mark}>Checks: {passed} of {topic.checks.length} passed{passed >= mark ? '' : `, ${mark} needed`}</li>
          <li data-done={explained}>Explain-back: {explained ? 'passed' : progress?.explainBack ? 'not passed yet' : 'not done yet'}</li>
          <li data-done={!!progress?.recheckPassedAt}>Delayed re-check: {progress?.recheckPassedAt ? 'passed' : 'comes back in Review after a day or more'}</li>
        </ul>
        <p className="muted small">A topic only becomes solid once all three are done. Coming back later is part of the method, not a failure.</p>
      </section>
    </div>
  )
}

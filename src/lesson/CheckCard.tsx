import { useId, useState, type FormEvent } from 'react'
import type { Check } from '../content/schema'
import type { CheckRecord } from '../lib/progressModel'
import { displayAnswer, isCorrect } from '../lib/answers'
import { CodeBlock } from '../components/CodeBlock'
import { HintLadder } from '../components/HintLadder'
import { Inline, Prose } from '../components/Prose'

/**
 * One question. Attempt before reveal: hints and the "show answer" button only
 * appear after a first attempt, and a revealed answer no longer counts as a pass.
 */
export function CheckCard({ check, index, label, record, hintsShown, onAnswer, onReveal, onHint, revealedNote = 'This one will come back in review.' }: {
  check: Check
  index: number
  /** Replaces the "Question n" label, e.g. with the topic name in Review. */
  label?: string
  revealedNote?: string
  record: CheckRecord | undefined
  hintsShown: number
  onAnswer: (answer: string, correct: boolean) => void
  onReveal: () => void
  onHint: () => void
}) {
  const id = useId()
  const [answer, setAnswer] = useState(record?.lastAnswer ?? '')
  const attempted = (record?.attempts ?? 0) > 0
  const solved = !!record?.correct
  const finished = solved || !!record?.revealed

  function submit(e: FormEvent) {
    e.preventDefault()
    if (answer.trim() === '') return
    onAnswer(answer.trim(), isCorrect(check, answer))
  }

  return (
    <section className="card check" aria-labelledby={`${id}-q`}>
      <h3 id={`${id}-q`} className="check-prompt">
        <span className="check-num">{label ?? `Question ${index + 1}`}</span>
        <Inline text={check.prompt} />
      </h3>
      {check.code && <CodeBlock snippet={check.code} />}

      <form onSubmit={submit} className="check-form">
        {check.kind === 'choice' ? (
          <fieldset className="choices" disabled={finished}>
            <legend className="visually-hidden">Choose one answer</legend>
            {check.options.map((opt, i) => (
              <label key={i} className="choice">
                <input type="radio" name={id} value={String(i)} checked={answer === String(i)} onChange={() => setAnswer(String(i))} />
                <span><Inline text={opt} /></span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div>
            <label htmlFor={`${id}-a`} className="visually-hidden">Your answer</label>
            <input
              id={`${id}-a`}
              className="text-input"
              inputMode={check.kind === 'number' ? 'numeric' : 'text'}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={check.kind === 'text' ? check.placeholder ?? 'Your answer' : 'A number'}
              value={answer}
              disabled={finished}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>
        )}
        {!finished && (
          <button type="submit" className="btn btn-primary" disabled={answer.trim() === ''}>
            {attempted ? 'Try again' : 'Check'}
          </button>
        )}
      </form>

      <div aria-live="polite">
        {attempted && !finished && <p className="feedback feedback-retry">Not quite. Have another go, or open a hint.</p>}
        {solved && <p className="feedback feedback-ok">{record?.passedAt ? 'Correct.' : `Correct, after seeing the answer. ${revealedNote}`}</p>}
        {record?.revealed && !solved && (
          <p className="feedback feedback-reveal">
            Answer: <strong><Inline text={displayAnswer(check)} /></strong>
          </p>
        )}
      </div>

      {finished ? (
        <Prose text={check.explanation} className="explanation" />
      ) : (
        <div className="check-help">
          <HintLadder hints={check.hints} shown={hintsShown} unlocked={attempted} onShowNext={onHint} />
          {attempted && (
            <button type="button" className="btn btn-quiet" onClick={onReveal}>Show the answer</button>
          )}
        </div>
      )}
    </section>
  )
}

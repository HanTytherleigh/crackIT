import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { modules } from '../content/modules'
import { backupFileName, createBackup, parseBackup, summariseBackup, type Backup } from '../lib/backup'
import { masteryLabel, masteryOf, topicKey, type TopicProgress } from '../lib/progressModel'
import { snapshot, useProgress } from '../state/progress'
import { settingsData, useSettings } from '../state/settings'
import { dueCards, MAX_BOX } from '../lib/scheduler'

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Things worth another look: checks that needed the answer or several tries, and explain-backs not yet passed. */
function weakSpots(p: TopicProgress | undefined): string[] {
  if (!p) return []
  const spots: string[] = []
  const struggled = Object.values(p.checks).filter((c) => c.revealed || (c.attempts > 1 && !c.passedAt)).length
  if (struggled) spots.push(`${struggled} ${struggled === 1 ? 'question needed' : 'questions needed'} the answer or several tries`)
  if (p.explainBack && !p.explainBackPassedAt) spots.push('Explain-back not passed yet')
  return spots
}

export function ProgressScreen() {
  const progress = useProgress()
  const settings = useSettings()
  const available = modules.filter((m) => m.status === 'available')
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState('')

  function exportProgress() {
    const now = new Date()
    progress.markExported(now)
    const backup = createBackup({ ...snapshot(useProgress.getState()) }, settingsData(settings), now)
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = backupFileName(now)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Progress exported. Keep the file somewhere safe, such as iCloud Drive.')
  }

  async function chooseFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const result = await parseBackup(await file.text())
    if (result.ok) {
      setPending(result.backup)
      setMessage('')
    } else {
      setPending(null)
      setMessage(result.error)
    }
  }

  function confirmImport() {
    if (!pending) return
    progress.replaceAll(pending.progress)
    if (pending.settings) settings.replace(pending.settings)
    setPending(null)
    setMessage('Progress imported.')
  }

  const summary = pending && summariseBackup(pending)
  const cards = Object.values(progress.review.cards)
  const dueNow = dueCards(progress.review.cards, new Date()).length
  const longTerm = cards.filter((c) => c.box >= 4).length

  return (
    <div className="page">
      <h1>Progress</h1>
      <p className="page-lead">A topic becomes solid after its checks, your own explanation, and a re-check a day or more later.</p>

      {available.map((m) => (
        <section key={m.id} className="card stack" aria-labelledby={`p-${m.id}`}>
          <h2 id={`p-${m.id}`}>{m.title}</h2>
          <ul className="mastery-list">
            {m.topics.map((t) => {
              const p = progress.topics[topicKey(m.id, t.id)]
              const mastery = masteryOf(p)
              const spots = weakSpots(p)
              return (
                <li key={t.id}>
                  <div className="mastery-row">
                    <Link to={`/learn/${m.id}/${t.id}`}>{t.title}</Link>
                    <span className="badge" data-mastery={mastery}>{masteryLabel[mastery]}</span>
                  </div>
                  {spots.length > 0 && (
                    <ul className="weak-spots">
                      {spots.map((s) => <li key={s}>{s}</li>)}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="card stack section-gap" aria-labelledby="review-stats-heading">
        <h2 id="review-stats-heading">Review cards</h2>
        {cards.length === 0 ? (
          <p className="muted">No review cards yet. Each check you answer in a lesson becomes one.</p>
        ) : (
          <>
            <ul className="mastery-list">
              <li><div className="mastery-row"><span>Cards in rotation</span><strong>{cards.length}</strong></div></li>
              <li><div className="mastery-row"><span>Due now</span><strong>{dueNow}</strong></div></li>
              <li><div className="mastery-row"><span>Well remembered (a week or more apart)</span><strong>{longTerm}</strong></div></li>
            </ul>
            <ol className="box-bars" aria-label="Cards in each Leitner box">
              {Array.from({ length: MAX_BOX }, (_, i) => i + 1).map((box) => {
                const count = cards.filter((c) => c.box === box).length
                return (
                  <li key={box} aria-label={`Box ${box}: ${count} ${count === 1 ? 'card' : 'cards'}`}>
                    <span className="box-bar" style={{ height: `${cards.length ? Math.max(4, (count / cards.length) * 64) : 4}px` }} />
                    <span className="small muted" aria-hidden="true">{box}</span>
                  </li>
                )
              })}
            </ol>
            <p className="small muted">Boxes 1 to {MAX_BOX}: each box waits longer before a card comes back. A miss sends it back to box 1.</p>
          </>
        )}
      </section>

      <section className="card stack section-gap" aria-labelledby="backup-heading">
        <h2 id="backup-heading">Back up your progress</h2>
        <p className="muted">
          Progress lives only on this device, and iOS can clear website data that hasn't been used for a while.
          Export now and then, and import the file to restore it here or on another device.
        </p>
        <p className="small">
          Last export: {progress.lastExportedAt ? dateFmt.format(new Date(progress.lastExportedAt)) : 'never'}
        </p>
        <div className="button-row">
          <button type="button" className="btn btn-primary" onClick={exportProgress}>Export progress</button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>Import from file</button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden="true" onChange={chooseFile} />
        </div>

        {pending && summary && (
          <div className="confirm-box" role="group" aria-labelledby="confirm-import-h">
            <h3 id="confirm-import-h">Replace your progress with this file?</h3>
            <p className="small">
              Exported {dateFmt.format(new Date(summary.exportedAt))}: {summary.topicsStarted} {summary.topicsStarted === 1 ? 'topic' : 'topics'} started,{' '}
              {summary.reviewCards} review {summary.reviewCards === 1 ? 'card' : 'cards'}.
            </p>
            <p className="small">Everything currently on this device will be overwritten.</p>
            <div className="button-row">
              <button type="button" className="btn btn-danger" onClick={confirmImport}>Replace my progress</button>
              <button type="button" className="btn" onClick={() => setPending(null)} autoFocus>Cancel</button>
            </div>
          </div>
        )}
        <p role="status" className="small">{message}</p>
      </section>
    </div>
  )
}

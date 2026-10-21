import { useState } from 'react'
import { useSettings, type SnippetLanguage, type ThemeChoice } from '../state/settings'
import { useProgress } from '../state/progress'
import { usePwa } from '../lib/pwa'

const checkMessage = {
  idle: '',
  checking: 'Checking…',
  'up-to-date': 'You have the latest version.',
  'update-ready': 'A new version is ready.',
  unavailable: "Couldn't check right now. Updates are also checked automatically when you open the app.",
} as const

const themeOptions: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
]
const languageOptions: { value: SnippetLanguage; label: string }[] = [
  { value: 'ts', label: 'TypeScript' },
  { value: 'py', label: 'Python' },
]

function Segmented<T extends string>({ legend, name, value, options, onChange }: {
  legend: string
  name: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="setting">
      <legend>{legend}</legend>
      <div className="segmented">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SettingsScreen() {
  const s = useSettings()
  const resetProgress = useProgress((p) => p.resetAll)
  const pwa = usePwa()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  function resetAll() {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('crackit.'))
      .forEach((k) => localStorage.removeItem(k))
    s.reset()
    resetProgress()
    setConfirmReset(false)
    setResetDone(true)
  }

  return (
    <div className="page">
      <h1>Settings</h1>
      <div className="card stack">
        <Segmented legend="Theme" name="theme" value={s.theme} options={themeOptions} onChange={s.setTheme} />
        <Segmented legend="Code snippets" name="lang" value={s.snippetLanguage} options={languageOptions} onChange={s.setSnippetLanguage} />

        <div className="setting">
          <label className="toggle">
            <input type="checkbox" checked={s.reducedMotion} onChange={(e) => s.setReducedMotion(e.target.checked)} />
            <span>
              Reduce motion
              <span className="muted setting-hint">Animations step instantly. Your system setting is always respected too.</span>
            </span>
          </label>
        </div>

        <div className="setting">
          <label htmlFor="timer">Focus timer length</label>
          <select id="timer" className="select" value={s.focusTimerMinutes} onChange={(e) => s.setFocusTimerMinutes(Number(e.target.value))}>
            {[0, 15, 20, 25].map((m) => (
              <option key={m} value={m}>{m === 0 ? 'Off' : `${m} minutes`}</option>
            ))}
          </select>
        </div>
      </div>

      <section className="card stack section-gap" aria-labelledby="danger-heading">
        <h2 id="danger-heading">Reset data</h2>
        <p className="muted">Deletes all progress, review schedules and settings on this device. Export first if you might want them back.</p>
        {!confirmReset ? (
          <button type="button" className="btn btn-danger" onClick={() => { setConfirmReset(true); setResetDone(false) }}>
            Reset all data
          </button>
        ) : (
          <div className="confirm-row" role="group" aria-label="Confirm reset">
            <span>This cannot be undone.</span>
            <button type="button" className="btn btn-danger" onClick={resetAll}>Yes, delete everything</button>
            <button type="button" className="btn" onClick={() => setConfirmReset(false)} autoFocus>Cancel</button>
          </div>
        )}
        <p role="status" className="muted">{resetDone ? 'All data on this device was reset.' : ''}</p>
      </section>

      <section className="card stack section-gap" aria-labelledby="version-heading">
        <h2 id="version-heading">App version</h2>
        <p className="muted">
          You are on version {__APP_VERSION__}. New versions download in the background, and you choose when to switch.
        </p>
        <div className="button-row">
          {pwa.needRefresh ? (
            <button type="button" className="btn btn-primary" onClick={pwa.applyUpdate}>Update now</button>
          ) : (
            <button type="button" className="btn" disabled={pwa.lastCheck === 'checking'} onClick={() => void pwa.checkNow()}>Check for updates</button>
          )}
        </div>
        <p role="status" className="small muted">{checkMessage[pwa.lastCheck]}</p>
      </section>

      <p className="muted about">crackIT runs entirely on your device. No accounts, no tracking, no network calls after it loads.</p>
    </div>
  )
}

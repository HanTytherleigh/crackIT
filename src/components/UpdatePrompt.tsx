import { usePwa } from '../lib/pwa'

/** A small banner offering to switch to a newly downloaded version. Nothing reloads until asked. */
export function UpdatePrompt() {
  const { needRefresh, dismissed, applyUpdate, dismiss } = usePwa()
  if (!needRefresh || dismissed) return null
  return (
    <div className="update-prompt" role="status">
      <p>A new version of crackIT is ready. Your progress is kept.</p>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={applyUpdate}>Update now</button>
        <button type="button" className="btn" onClick={dismiss}>Later</button>
      </div>
    </div>
  )
}

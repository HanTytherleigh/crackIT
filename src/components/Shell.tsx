import type { ReactNode } from 'react'
import { NavLink, Link, useMatch } from 'react-router-dom'
import { HomeIcon, LearnIcon, PatternsIcon, ProgressIcon, ReviewIcon, SettingsIcon } from './Icons'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/learn', label: 'Learn', icon: LearnIcon, end: false },
  { to: '/patterns', label: 'Patterns', icon: PatternsIcon, end: false },
  { to: '/review', label: 'Review', icon: ReviewIcon, end: false },
  { to: '/progress', label: 'Progress', icon: ProgressIcon, end: false },
]

function Brand() {
  return (
    <Link to="/" className="brand">
      <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width={28} height={28} />
      crackIT
    </Link>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  // Lessons run in focus mode: no navigation chrome, just the lesson.
  const inLesson = useMatch('/learn/:moduleId/:topicId') !== null

  return (
    <div className={`shell${inLesson ? ' focus-mode' : ''}`}>
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>

      {!inLesson && (
        <aside className="sidebar">
          <Brand />
          <nav aria-label="Main">
            {tabs.map(({ to, label, icon: TabIcon, end }) => (
              <NavLink key={to} to={to} end={end} className="nav-item">
                <TabIcon />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="spacer" />
          <NavLink to="/settings" className="nav-item">
            <SettingsIcon />
            Settings
          </NavLink>
        </aside>
      )}

      <div className="shell-main">
        {!inLesson && (
          <header className="topbar">
            <Brand />
            <span />
            <NavLink to="/settings" className="icon-btn" aria-label="Settings">
              <SettingsIcon />
            </NavLink>
          </header>
        )}
        <main id="main" tabIndex={-1}>
          {children}
        </main>
      </div>

      {!inLesson && (
        <nav className="tabbar" aria-label="Main">
          {tabs.map(({ to, label, icon: TabIcon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <TabIcon />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}

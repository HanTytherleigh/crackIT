import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { HomeScreen } from './screens/HomeScreen'
import { LearnScreen } from './screens/LearnScreen'
import { ModuleScreen } from './screens/ModuleScreen'
import { LessonScreen } from './screens/LessonScreen'
import { PatternsScreen } from './screens/PatternsScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { applySettingsToDocument, useSettings } from './state/settings'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export function App() {
  const theme = useSettings((s) => s.theme)
  const reducedMotion = useSettings((s) => s.reducedMotion)
  useEffect(() => applySettingsToDocument({ theme, reducedMotion }), [theme, reducedMotion])

  return (
    // Hash routing keeps every route at index.html, so refreshes on GitHub Pages never 404.
    <HashRouter>
      <ScrollToTop />
      <Shell>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/learn/:moduleId" element={<ModuleScreen />} />
          <Route path="/learn/:moduleId/:topicId" element={<LessonScreen />} />
          <Route path="/patterns" element={<PatternsScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
      </Shell>
    </HashRouter>
  )
}

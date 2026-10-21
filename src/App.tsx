import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Shell } from './components/Shell'
import { HomeScreen } from './screens/HomeScreen'
import { LearnScreen } from './screens/LearnScreen'
import { ModuleScreen } from './screens/ModuleScreen'
import { NotFoundScreen } from './screens/NotFoundScreen'
import { applySettingsToDocument, useSettings } from './state/settings'
// Screens beyond Home and Learn load on demand, keeping the first download small.
const LessonScreen = lazy(() => import('./screens/LessonScreen').then((m) => ({ default: m.LessonScreen })))
const PatternsScreen = lazy(() => import('./screens/PatternsScreen').then((m) => ({ default: m.PatternsScreen })))
const PatternDetailScreen = lazy(() => import('./screens/patterns/PatternDetailScreen').then((m) => ({ default: m.PatternDetailScreen })))
const SignalDrillScreen = lazy(() => import('./screens/patterns/SignalDrillScreen').then((m) => ({ default: m.SignalDrillScreen })))
const LookalikeDrillScreen = lazy(() => import('./screens/patterns/LookalikeDrillScreen').then((m) => ({ default: m.LookalikeDrillScreen })))
const ComplexityDrillScreen = lazy(() => import('./screens/patterns/ComplexityDrillScreen').then((m) => ({ default: m.ComplexityDrillScreen })))
const ReviewScreen = lazy(() => import('./screens/ReviewScreen').then((m) => ({ default: m.ReviewScreen })))
const ProgressScreen = lazy(() => import('./screens/ProgressScreen').then((m) => ({ default: m.ProgressScreen })))
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })))

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
        <Suspense fallback={<div className="page"><p className="muted" role="status">Loading…</p></div>}>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/learn" element={<LearnScreen />} />
          <Route path="/learn/:moduleId" element={<ModuleScreen />} />
          <Route path="/learn/:moduleId/:topicId" element={<LessonScreen />} />
          <Route path="/patterns" element={<PatternsScreen />} />
          <Route path="/patterns/drill/signals" element={<SignalDrillScreen />} />
          <Route path="/patterns/drill/lookalikes" element={<LookalikeDrillScreen />} />
          <Route path="/patterns/drill/complexity" element={<ComplexityDrillScreen />} />
          <Route path="/patterns/:patternId" element={<PatternDetailScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<NotFoundScreen />} />
        </Routes>
        </Suspense>
      </Shell>
    </HashRouter>
  )
}

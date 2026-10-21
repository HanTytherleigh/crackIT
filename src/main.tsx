import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { requestPersistentStorage } from './lib/storage'
import { startPwa } from './lib/pwa'
import './styles/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/screens.css'
import './styles/lesson.css'
import './styles/widgets.css'

void requestPersistentStorage()
startPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

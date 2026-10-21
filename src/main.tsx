import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { requestPersistentStorage } from './lib/storage'
import './styles/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/screens.css'
import './styles/lesson.css'

void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

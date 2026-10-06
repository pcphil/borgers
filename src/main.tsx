import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { exposeDebug } from './app/debug'
import { initAudio } from './audio/sfx'
import './index.css'
import { App } from './ui/App'

const root = document.getElementById('root')
if (!root) throw new Error('missing #root')
initAudio()
exposeDebug()
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

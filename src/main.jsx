import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry } from './services/sentry.js'
import { initCapacitor } from './capacitor/init.js'
import { validateClientEnv } from './utils/envCheck.js'

validateClientEnv()
initSentry()
initCapacitor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

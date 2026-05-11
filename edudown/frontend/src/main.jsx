import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

async function init() {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { setupMockApi } = await import('./mockApi.js')
    setupMockApi()
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

init()

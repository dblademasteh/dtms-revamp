import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Apply persisted theme (dark/light/system) before first paint so a reload
// does not flash or revert the saved choice.
const savedTheme = localStorage.getItem('dtms-theme') || 'light'
const root = document.documentElement
function applyTheme(theme: string) {
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', systemDark)
  }
}
applyTheme(savedTheme)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

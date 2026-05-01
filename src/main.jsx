import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LandingPage from './components/Landing/LandingPage.jsx'

const path = window.location.pathname

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/pos' ? <App /> : <LandingPage />}
  </StrictMode>,
)

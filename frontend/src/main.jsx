import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'boxicons/css/boxicons.min.css'
import App from './App.jsx'
import { installApiInterceptor } from './modules/core/lib/apiInterceptor'

installApiInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

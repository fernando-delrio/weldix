import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'boxicons/css/boxicons.min.css'
// Fuentes self-hosted — sin Google Fonts, GDPR compliant
import '@fontsource/inter/300.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/bricolage-grotesque/400.css'
import '@fontsource/bricolage-grotesque/600.css'
import '@fontsource/bricolage-grotesque/700.css'
import '@fontsource/bricolage-grotesque/800.css'
import '@fontsource/rajdhani/400.css'
import '@fontsource/rajdhani/500.css'
import '@fontsource/rajdhani/600.css'
import '@fontsource/rajdhani/700.css'
import App from './App.jsx'
import { installApiInterceptor } from './modules/core/lib/apiInterceptor'

installApiInterceptor()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

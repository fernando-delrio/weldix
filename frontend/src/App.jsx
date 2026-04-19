import AppRoutes from './routes'
import { ThemeProvider } from './modules/core/lib/ThemeContext'

const App = () => (
  <ThemeProvider>
    <AppRoutes />
  </ThemeProvider>
)

export default App

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AvisoActualizacion from './components/AvisoActualizacion.jsx'
import { iniciarActualizaciones } from './actualizacion.js'

iniciarActualizaciones()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <AvisoActualizacion />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './compu.css'
import App from './App.jsx'
import { iniciarActualizaciones } from './actualizacion.js'
import { prepararSonido } from './sounds.js'

iniciarActualizaciones()
prepararSonido()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

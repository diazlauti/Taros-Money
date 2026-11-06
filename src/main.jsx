import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './compu.css'
import App, { panelPrecargado } from './App.jsx'
import { iniciarActualizaciones } from './actualizacion.js'
import { prepararSonido } from './sounds.js'

// Letra e íconos (index.html): se activan acá para que no frenen la carga.
document.querySelectorAll('link[data-sin-frenar]').forEach((l) => { l.media = 'all' })

iniciarActualizaciones()
prepararSonido()

// Con sesión abierta espera el panel (ya se está bajando) para dibujarlo de una.
panelPrecargado.then(() =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)

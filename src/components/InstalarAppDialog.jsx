import { useState } from "react";
import { detectarPlataforma, estaInstalada, useInstalacion } from "../instalacion";
import { playError, playSuccess } from "../sounds";
import Dialog from "./Dialog";

const PLATAFORMAS = [
  ["ios", "iPhone / iPad"],
  ["android", "Android"],
  ["compu", "Compu"],
];

const PASOS = {
  ios: [
    {
      icono: "ph ph-compass",
      texto: "Abrí esta página en Safari (en otros navegadores puede no aparecer la opción).",
    },
    {
      icono: "ph ph-export",
      texto: "Tocá el botón Compartir: el cuadrado con la flecha para arriba, en la barra de abajo.",
    },
    {
      icono: "ph ph-plus-square",
      texto: "Bajá en la lista y tocá «Agregar a inicio».",
    },
    {
      icono: "ph ph-check-circle",
      texto: "Tocá «Agregar» arriba a la derecha. Listo: el ícono queda en tu pantalla de inicio.",
    },
  ],
  android: [
    {
      icono: "ph ph-dots-three-vertical",
      texto: "En Chrome, tocá el menú de los tres puntos, arriba a la derecha.",
    },
    {
      icono: "ph ph-device-mobile",
      texto: "Tocá «Instalar app» o «Agregar a la pantalla principal».",
    },
    {
      icono: "ph ph-check-circle",
      texto: "Confirmá con «Instalar». El ícono aparece en tu pantalla de inicio.",
    },
  ],
  compu: [
    {
      icono: "ph ph-download-simple",
      texto: "En Chrome o Edge, tocá el ícono de instalar que aparece a la derecha de la barra de direcciones.",
    },
    {
      icono: "ph ph-dots-three-vertical",
      texto: "Si no lo ves, abrí el menú del navegador y buscá «Instalar Taros Money».",
    },
    {
      icono: "ph ph-check-circle",
      texto: "Confirmá con «Instalar». Se abre en su propia ventana, como cualquier programa.",
    },
  ],
};

// Guía para agregar la app a la pantalla de inicio. Si el navegador deja
// instalar directo (Android/compu), muestra el botón; si no (iPhone),
// explica el paso a paso. Se puede cambiar de plataforma a mano por si
// alguien la está mirando en la compu para hacerlo en el celu.
export default function InstalarAppDialog({ onClose }) {
  const [plataforma, setPlataforma] = useState(detectarPlataforma);
  const [estado, setEstado] = useState(estaInstalada() ? "instalada" : "");
  const { puedeInstalar, instalar } = useInstalacion();

  async function instalarAhora() {
    try {
      const resultado = await instalar();
      if (resultado === "aceptada") {
        playSuccess();
        setEstado("instalada");
      } else {
        setEstado("cancelada");
      }
    } catch {
      playError();
      setEstado("error");
    }
  }

  const mostrarBoton = puedeInstalar && plataforma !== "ios";

  return (
    <Dialog titulo="Agregar a la pantalla de inicio" onClose={onClose}>
      <p className="texto-intro">
        Así abrís Taros Money con un toque, en pantalla completa y sin buscar el link.
      </p>

      {estado === "instalada" ? (
        <div className="estado" role="status">
          <i className="ph ph-check-circle instalar-ok" aria-hidden="true" />
          <p>Ya la tenés instalada. Buscá el ícono de Taros Money en tu pantalla de inicio.</p>
        </div>
      ) : (
        <>
          <fieldset className="field">
            <legend>¿Dónde la querés instalar?</legend>
            <div className="seg">
              {PLATAFORMAS.map(([valor, texto]) => (
                <label className="seg-opt" key={valor}>
                  <input
                    type="radio"
                    name="plataforma-instalar"
                    checked={plataforma === valor}
                    onChange={() => setPlataforma(valor)}
                  />
                  {texto}
                </label>
              ))}
            </div>
          </fieldset>

          {mostrarBoton && (
            <button type="button" className="btn btn-primary" onClick={instalarAhora} data-autofocus>
              <i className="ph ph-download-simple" aria-hidden="true" />
              Instalar Taros Money
            </button>
          )}

          <div className="pila-chica">
            {mostrarBoton && <p className="texto-tenue">Si el botón no anda, hacelo a mano:</p>}
            <ol className="pasos">
              {PASOS[plataforma].map((paso) => (
                <li key={paso.texto} className="paso">
                  <span className="paso-icono">
                    <i className={paso.icono} aria-hidden="true" />
                  </span>
                  <span>{paso.texto}</span>
                </li>
              ))}
            </ol>
          </div>

          <div aria-live="polite">
            {estado === "cancelada" && (
              <p className="mensaje-estado">No pasa nada, podés instalarla cuando quieras desde Configuración.</p>
            )}
            {estado === "error" && (
              <p className="mensaje-error">No se pudo abrir el instalador. Seguí los pasos de arriba a mano.</p>
            )}
          </div>
        </>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Dialog>
  );
}

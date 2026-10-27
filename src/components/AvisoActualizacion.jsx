import { useState } from "react";
import { actualizarAhora, descartarPorAhora, useHayVersionNueva } from "../actualizacion";

// Cartel de arriba: «Hay una versión nueva · Actualizar». Solo se muestra
// con la sesión abierta (App.jsx), no en la landing ni en el login.
export default function AvisoActualizacion() {
  const hayNueva = useHayVersionNueva();
  const [actualizando, setActualizando] = useState(false);

  return (
    <div className="aviso-version-capa" role="status" aria-live="polite">
      {hayNueva && (
        <div className="aviso-version">
          <i className="ph ph-arrow-circle-up" aria-hidden="true" />
          <span className="aviso-version-texto">{actualizando ? "Actualizando…" : "Hay una versión nueva"}</span>
          <button
            type="button"
            className="btn btn-primary aviso-version-boton"
            disabled={actualizando}
            onClick={() => {
              setActualizando(true);
              actualizarAhora();
            }}
          >
            Actualizar
          </button>
          {!actualizando && (
            <button type="button" className="btn btn-texto aviso-version-cerrar" aria-label="Después" onClick={descartarPorAhora}>
              <i className="ph ph-x" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

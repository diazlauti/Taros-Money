import { useCallback, useMemo, useRef, useState } from "react";
import { AvisosContext } from "../avisos";

// Sale del token --dur-aviso de index.css (con un valor de respaldo).
function duracionAviso() {
  const valor = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--dur-aviso"), 10);
  return Number.isFinite(valor) ? valor : 3200;
}

// Muestra avisos cortos abajo de la pantalla y los anuncia a lectores de
// pantalla (role="status" = aria-live polite).
export default function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const siguienteId = useRef(0);

  const avisar = useCallback((texto, tipo = "exito") => {
    const id = siguienteId.current++;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), duracionAviso());
  }, []);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={"aviso" + (a.tipo === "error" ? " aviso--error" : "")}>
            <i className={a.tipo === "error" ? "ph ph-warning-circle" : "ph ph-check-circle"} aria-hidden="true" />
            {a.texto}
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

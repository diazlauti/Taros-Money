import { useCallback, useRef, useState } from "react";
import { ConfirmarContext } from "../confirmar";
import Dialog from "./Dialog";

// Uso: const confirmar = useConfirmar();
//      if (!(await confirmar({ titulo, texto, si: "Borrar", peligro: true }))) return;
// El foco arranca en «Cancelar» para que un Enter apurado no borre nada.
export default function ConfirmarProvider({ children }) {
  const [pregunta, setPregunta] = useState(null);
  const resolver = useRef(null);

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setPregunta(opciones);
      }),
    [],
  );

  function responder(valor) {
    resolver.current?.(valor);
    resolver.current = null;
    setPregunta(null);
  }

  return (
    <ConfirmarContext.Provider value={confirmar}>
      {children}
      {pregunta && (
        <Dialog titulo={pregunta.titulo} onClose={() => responder(false)} variante="confirmar">
          {pregunta.texto && <p className="texto-intro">{pregunta.texto}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={() => responder(false)} data-autofocus>
              {pregunta.no || "Cancelar"}
            </button>
            <button
              type="button"
              className={pregunta.peligro ? "btn btn-primary btn-primary--peligro" : "btn btn-primary"}
              onClick={() => responder(true)}
            >
              {pregunta.peligro && <i className="ph ph-trash" aria-hidden="true" />}
              {pregunta.si || "Aceptar"}
            </button>
          </div>
        </Dialog>
      )}
    </ConfirmarContext.Provider>
  );
}

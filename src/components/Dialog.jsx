import { useEffect, useId, useRef } from "react";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diálogo modal accesible: foco atrapado adentro, Esc para cerrar, devuelve
// el foco a donde estaba al cerrarse. Si "sucio" es true (hay datos sin
// guardar), pregunta antes de cerrar para no perder lo que escribiste.
export default function Dialog({ titulo, onClose, sucio = false, children }) {
  const panelRef = useRef(null);
  const tituloId = useId();
  const sucioRef = useRef(sucio);
  const onCloseRef = useRef(onClose);
  sucioRef.current = sucio;
  onCloseRef.current = onClose;

  function intentarCerrar() {
    if (sucioRef.current && !window.confirm("¿Cerrar sin guardar? Se pierde lo que cargaste.")) return;
    onCloseRef.current();
  }

  useEffect(() => {
    const anterior = document.activeElement;
    const panel = panelRef.current;
    const inicial = panel.querySelector("[data-autofocus]") || panel.querySelector(ENFOCABLES) || panel;
    inicial.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        intentarCerrar();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...panel.querySelectorAll(ENFOCABLES)];
      if (items.length === 0) return;
      const primero = items[0];
      const ultimo = items[items.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (anterior && typeof anterior.focus === "function") anterior.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) intentarCerrar();
      }}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={tituloId} ref={panelRef} tabIndex={-1}>
        <h2 className="dialog-title" id={tituloId}>
          {titulo}
        </h2>
        {children}
      </div>
    </div>
  );
}

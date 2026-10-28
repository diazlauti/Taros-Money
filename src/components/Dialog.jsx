import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { useConfirmar } from "../confirmar";

const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diálogo modal accesible: foco atrapado adentro, Esc para cerrar, devuelve
// el foco a donde estaba al cerrarse. Si "sucio" es true (hay datos sin
// guardar), pregunta antes de cerrar para no perder lo que escribiste.
// "variante" suma una clase (ej. "tour": en el celu va abajo y deja ver la
// sección de atrás).
// Se dibuja directo en <body>: si quedara adentro de una sección animada
// (como los bloques del Resumen), la animación lo encierra en esa sección y
// lo que viene después le pasa por encima.
export default function Dialog({ titulo, onClose, sucio = false, variante, children }) {
  const panelRef = useRef(null);
  const tituloId = useId();
  const sucioRef = useRef(sucio);
  const onCloseRef = useRef(onClose);
  const confirmar = useConfirmar();
  const confirmarRef = useRef(confirmar);
  sucioRef.current = sucio;
  onCloseRef.current = onClose;
  confirmarRef.current = confirmar;

  async function intentarCerrar() {
    if (sucioRef.current) {
      const cerrar = await confirmarRef.current({
        titulo: "¿Cerrar sin guardar?",
        texto: "Se pierde lo que cargaste.",
        si: "Cerrar igual",
        no: "Seguir editando",
      });
      if (!cerrar) return;
    }
    onCloseRef.current();
  }

  useEffect(() => {
    const anterior = document.activeElement;
    const panel = panelRef.current;
    const inicial = panel.querySelector("[data-autofocus]") || panel.querySelector(ENFOCABLES) || panel;
    inicial.focus();

    function onKeyDown(e) {
      // Con otro diálogo abierto encima (ej. el "¿Seguro?"), las teclas son
      // de ese.
      if (!panel.contains(document.activeElement)) return;
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

  return createPortal(
    <div
      className={"dialog-backdrop" + (variante ? ` dialog-backdrop--${variante}` : "")}
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
    </div>,
    document.body,
  );
}

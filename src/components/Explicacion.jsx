import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

// Una explicación que no ocupa lugar: un texto subrayado (o un ícono «i»)
// que al tocarlo abre un cartelito abajo. Se cierra tocando afuera, con
// Escape o tocándolo de nuevo.
//   <Explicacion texto="La que cobra el banco…">Percepción de Ganancias</Explicacion>
//   <Explicacion texto="…" etiqueta="Qué es la planilla" />   ← solo el ícono
export default function Explicacion({ texto, etiqueta, children }) {
  const [abierta, setAbierta] = useState(false);
  const [corrimiento, setCorrimiento] = useState(0);
  const id = useId();
  const raiz = useRef(null);
  const boton = useRef(null);
  const globo = useRef(null);
  const soloIcono = !children;

  useEffect(() => {
    if (!abierta) return undefined;
    function tocarAfuera(e) {
      if (!raiz.current?.contains(e.target)) setAbierta(false);
    }
    // En captura: así Escape cierra el cartelito y no el diálogo de abajo.
    function tecla(e) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setAbierta(false);
      boton.current?.focus();
    }
    document.addEventListener("pointerdown", tocarAfuera);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("pointerdown", tocarAfuera);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [abierta]);

  // Que el cartelito no se salga de la pantalla por los costados.
  useLayoutEffect(() => {
    if (!abierta || !globo.current) return;
    const margen = 16;
    const r = globo.current.getBoundingClientRect();
    let dx = 0;
    if (r.right > window.innerWidth - margen) dx = window.innerWidth - margen - r.right;
    if (r.left + dx < margen) dx = margen - r.left;
    setCorrimiento(dx);
  }, [abierta]);

  function alternar() {
    if (abierta) setCorrimiento(0);
    setAbierta(!abierta);
  }

  return (
    <span className="explicacion" ref={raiz}>
      <button
        ref={boton}
        type="button"
        className={soloIcono ? "explicacion-icono" : "explicacion-termino"}
        aria-expanded={abierta}
        aria-controls={abierta ? id : undefined}
        aria-label={soloIcono ? etiqueta || "Más info" : undefined}
        onClick={alternar}
      >
        {soloIcono ? <i className="ph ph-info" aria-hidden="true" /> : children}
      </button>
      {abierta && (
        <span
          id={id}
          ref={globo}
          role="note"
          className="explicacion-globo"
          style={{ "--corrimiento": `${corrimiento}px` }}
        >
          {texto}
        </span>
      )}
    </span>
  );
}

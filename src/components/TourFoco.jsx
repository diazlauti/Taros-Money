import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { buscarObjetivo } from "../tour";

// Foco del recorrido: oscurece toda la pantalla menos lo que el paso está
// mostrando (uno o varios botones/secciones), con un anillo alrededor.
// La parte oscura frena los toques: así no te vas a otra sección en medio
// del recorrido. Por los huecos sí se puede tocar (en las prácticas).
// Qué resaltar se busca con buscarObjetivo (ver tour.js).

// Con otro diálogo abierto (ej. «Nuevo movimiento» en la práctica), ese ya
// tapa la pantalla: el foco se corre para no oscurecer dos veces.
function hayOtroDialogo() {
  return Boolean(document.querySelector(".dialog-backdrop:not(.dialog-backdrop--tour)"));
}

// Medidas que vienen de los tokens de :root (margen alrededor y redondeo).
function medida(nombre, porDefecto) {
  const valor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nombre));
  return Number.isFinite(valor) ? valor : porDefecto;
}

// Rectángulo redondeado como trazo SVG (para el hueco).
function rectRedondeado({ x, y, w, h }, r) {
  const radio = Math.min(r, w / 2, h / 2);
  return (
    `M${x + radio} ${y}H${x + w - radio}A${radio} ${radio} 0 0 1 ${x + w} ${y + radio}` +
    `V${y + h - radio}A${radio} ${radio} 0 0 1 ${x + w - radio} ${y + h}` +
    `H${x + radio}A${radio} ${radio} 0 0 1 ${x} ${y + h - radio}` +
    `V${y + radio}A${radio} ${radio} 0 0 1 ${x + radio} ${y}Z`
  );
}

function medir(objetivos, margen) {
  if (hayOtroDialogo()) return null;
  return objetivos
    .map(buscarObjetivo)
    .filter(Boolean)
    .map((el) => {
      const r = el.getBoundingClientRect();
      // Se recorta a la pantalla, para que el anillo no quede cortado en
      // los bordes (ej. «Más», pegado abajo).
      const borde = 2;
      const x = Math.max(borde, r.left - margen);
      const y = Math.max(borde, r.top - margen);
      const derecha = Math.min(window.innerWidth - borde, r.right + margen);
      const abajo = Math.min(window.innerHeight - borde, r.bottom + margen);
      return { x: Math.round(x), y: Math.round(y), w: Math.round(derecha - x), h: Math.round(abajo - y) };
    })
    .filter((r) => r.w > 0 && r.h > 0);
}

export default function TourFoco({ objetivos }) {
  const [estado, setEstado] = useState(null);
  const clave = objetivos.join("|");

  // Se mide en cada cuadro: el contenido carga, se scrollea o aparece el
  // teclado del celu, y el foco tiene que seguir a lo que resalta.
  useEffect(() => {
    const lista = clave.split("|");
    const margen = medida("--tour-foco-margen", 8);
    const radio = medida("--radius-md", 16);
    let anterior = "";
    let cuadro;
    function tick() {
      const rects = medir(lista, margen);
      const nuevo = { rects, ancho: window.innerWidth, alto: window.innerHeight, radio };
      const firma = JSON.stringify(nuevo);
      if (firma !== anterior) {
        anterior = firma;
        setEstado(nuevo);
      }
      cuadro = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(cuadro);
  }, [clave]);

  if (!estado || !estado.rects) return null;
  const { rects, ancho, alto, radio } = estado;
  const trazo = `M0 0H${ancho}V${alto}H0Z ` + rects.map((r) => rectRedondeado(r, radio)).join(" ");

  return createPortal(
    <div className="tour-foco" aria-hidden="true">
      <svg className="tour-foco-sombra" width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`}>
        <path d={trazo} fillRule="evenodd" />
      </svg>
      {rects.map((r, i) => (
        <span key={i} className="tour-foco-anillo" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
      ))}
    </div>,
    document.body,
  );
}

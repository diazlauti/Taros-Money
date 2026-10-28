// Recuerda si ya se vio el recorrido de primera vez (ver components/Tour.jsx).

const STORAGE_KEY = "taros-tour-visto";

export function tourVisto() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // sin storage no se puede recordar: mejor no mostrarlo cada vez
  }
}

export function marcarTourVisto() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* modo privado o storage bloqueado */
  }
}

// El recorrido tiene pasos de práctica que esperan a que la persona haga
// algo de verdad (cargar o borrar un movimiento). Los diálogos avisan con
// un evento de window cuando eso pasa; si no hay recorrido abierto, nadie
// lo escucha y no cambia nada.
export const EVENTO_TOUR = "taros:tour-accion";

export function avisarAccionTour(accion) {
  window.dispatchEvent(new CustomEvent(EVENTO_TOUR, { detail: accion }));
}

// Qué resalta el foco del recorrido (components/TourFoco.jsx). Cada
// objetivo es un selector CSS, con dos atajos:
// - "nav:servicios": el botón del menú de esa sección. En el celu, si no
//   está en la barra de abajo, se resalta «Más».
// - "card:#titulo-monedas": la tarjeta que contiene ese elemento. Si está
//   dentro de un desplegable cerrado (los grupos de Configuración), se abre.
// - "cerrado:.config-grupos": ese elemento, con sus desplegables cerrados
//   (para mostrar la lista de grupos entera, sin el que quedó abierto).
// Si hay varios que coinciden, se usa el primero que se ve.

function visible(el) {
  return el && el.getClientRects().length > 0;
}

function primeroVisible(selector) {
  return [...document.querySelectorAll(selector)].find(visible) || null;
}

export function buscarObjetivo(objetivo) {
  if (objetivo.startsWith("nav:")) {
    return primeroVisible(`[data-tour="nav-${objetivo.slice(4)}"]`) || primeroVisible('[data-tour="nav-mas"]');
  }
  if (objetivo.startsWith("card:")) {
    const selector = objetivo.slice(5);
    if (!primeroVisible(selector)) abrirDesplegable(selector);
    return primeroVisible(selector)?.closest("section, .card, form") || null;
  }
  if (objetivo.startsWith("cerrado:")) {
    const el = primeroVisible(objetivo.slice(8));
    el?.querySelectorAll("details[open]").forEach((d) => (d.open = false));
    return el;
  }
  return primeroVisible(objetivo);
}

function abrirDesplegable(selector) {
  const cerrado = document.querySelector(selector)?.closest("details:not([open])");
  if (cerrado) cerrado.open = true;
}

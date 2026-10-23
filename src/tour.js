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

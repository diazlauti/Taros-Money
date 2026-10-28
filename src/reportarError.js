// «Avisar del error»: cualquier cartel de error puede pedir que se abra el
// formulario de sugerencias ya completado con ese error. Va por un evento
// del navegador para no tener que pasar props por toda la app; lo escucha
// components/ReporteErrores.jsx (montado una sola vez en el panel principal).
const EVENTO = "taros:avisar-error";

export function avisarDelError(texto) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { texto: String(texto ?? "").trim() } }));
}

export function escucharAvisosDeError(fn) {
  const manejar = (e) => fn(e.detail?.texto || "");
  window.addEventListener(EVENTO, manejar);
  return () => window.removeEventListener(EVENTO, manejar);
}

// Agregar la app a la pantalla de inicio (PWA).
// Android y compu (Chrome/Edge) avisan con "beforeinstallprompt" que se
// puede instalar: se guarda ese evento para mostrar el diálogo nativo desde
// nuestro botón. iPhone/iPad no tienen ese evento, ahí sólo se puede
// explicar el paso a paso de Safari.
import { useCallback, useSyncExternalStore } from "react";

let eventoInstalar = null;
const oyentes = new Set();

function notificar() {
  oyentes.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalar = e;
    notificar();
  });
  window.addEventListener("appinstalled", () => {
    eventoInstalar = null;
    notificar();
  });
}

function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function detectarPlataforma() {
  const ua = navigator.userAgent || "";
  // iPadOS se presenta como Mac: se lo reconoce porque tiene pantalla táctil.
  const esIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (esIos) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "compu";
}

export function estaInstalada() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

export function useInstalacion() {
  const puedeInstalar = useSyncExternalStore(suscribir, () => eventoInstalar !== null);

  // Devuelve "aceptada" o "cancelada". El evento sirve una sola vez.
  const instalar = useCallback(async () => {
    const evento = eventoInstalar;
    if (!evento) return "cancelada";
    eventoInstalar = null;
    notificar();
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    return outcome === "accepted" ? "aceptada" : "cancelada";
  }, []);

  return { puedeInstalar, instalar };
}

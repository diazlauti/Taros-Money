// Versiones nuevas de la app. El service worker guarda la app en el
// dispositivo para que abra al toque, pero en el iPhone la app instalada
// casi nunca se abre "de cero" (vuelve desde segundo plano) y no tiene
// botón de recargar, así que nunca se enteraba de que había otra versión.
//
// Ahora: se busca versión nueva al volver a la app y cada 30 minutos. Si
// hay, se muestra «Hay una versión nueva · Actualizar»; al tocarlo, la
// versión nueva toma el control y la página se recarga sola.
import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

const CADA_CUANTO_MS = 30 * 60 * 1000;
// Al volver a la app, no buscar de nuevo si se buscó hace menos de esto.
const MINIMO_ENTRE_BUSQUEDAS_MS = 60 * 1000;
const ESPERA_INSTALACION_MS = 20 * 1000;

// Fecha en que se publicó esta versión (la pone vite.config.js al compilar).
export const FECHA_VERSION = typeof __FECHA_VERSION__ === "string" ? __FECHA_VERSION__ : "";

let hayNueva = false;
let registro = null;
let ultimaBusqueda = 0;
let aplicarNueva = null;
const oyentes = new Set();

function cambiar(valor) {
  hayNueva = valor;
  for (const o of oyentes) o();
}

function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

async function buscar() {
  if (!registro || !navigator.onLine) return;
  ultimaBusqueda = Date.now();
  try {
    await registro.update();
  } catch {
    /* sin conexión o el servidor no respondió: se prueba en la próxima */
  }
}

export function iniciarActualizaciones() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  aplicarNueva = registerSW({
    onNeedRefresh() {
      cambiar(true);
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      registro = reg;
      setInterval(buscar, CADA_CUANTO_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        // Si la dejaste para después, se vuelve a ofrecer al volver a la app.
        if (registro.waiting) cambiar(true);
        else if (Date.now() - ultimaBusqueda > MINIMO_ENTRE_BUSQUEDAS_MS) buscar();
      });
    },
  });
}

// Instala la versión nueva y recarga. Si por algo no recarga sola en unos
// segundos, recarga igual (la versión nueva ya quedó lista).
export function actualizarAhora() {
  if (aplicarNueva) aplicarNueva(true);
  setTimeout(() => window.location.reload(), 4000);
}

// Para el botón «Buscar actualización» de Configuración. Devuelve "nueva",
// "al-dia" o "sin-conexion".
export async function buscarActualizacion() {
  if (hayNueva) return "nueva";
  if (!registro) return "al-dia";
  if (!navigator.onLine) return "sin-conexion";
  ultimaBusqueda = Date.now();
  try {
    await registro.update();
  } catch {
    return "sin-conexion";
  }
  const instalando = registro.installing;
  if (instalando) {
    await new Promise((listo) => {
      const fin = setTimeout(listo, ESPERA_INSTALACION_MS);
      instalando.addEventListener("statechange", () => {
        if (instalando.state !== "installing") {
          clearTimeout(fin);
          listo();
        }
      });
    });
  }
  if (registro.waiting) {
    cambiar(true);
    return "nueva";
  }
  return "al-dia";
}

export function descartarPorAhora() {
  cambiar(false);
}

export function useHayVersionNueva() {
  return useSyncExternalStore(suscribir, () => hayNueva);
}

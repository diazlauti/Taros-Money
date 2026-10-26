// Avisos en el celu o la compu aunque la app esté cerrada (Web Push). El
// navegador da una "dirección" para este dispositivo; se guarda en el
// backend y el Apps Script la usa para mandar los avisos.
import { activarPushBackend, desactivarPushBackend } from "./api";

const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function pushConfigurado() {
  return !!CLAVE_PUBLICA;
}

export function pushSoportado() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// En iPhone/iPad solo anda con la app agregada a la pantalla de inicio.
export function esIOSSinInstalar() {
  if (typeof navigator === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const instalada = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  return ios && !instalada;
}

function aBytes(base64url) {
  const b64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (base64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function registro() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("La app todavía se está instalando. Recargá la página y probá de nuevo.");
  return navigator.serviceWorker.ready;
}

// La suscripción de este dispositivo, si ya existe (o null).
export async function suscripcionActual() {
  if (!pushSoportado()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return (await reg?.pushManager.getSubscription()) || null;
  } catch {
    return null;
  }
}

// Tiene que llamarse desde un click (el permiso lo pide el navegador).
export async function activarPush() {
  if (!pushSoportado()) throw new Error("Este navegador no permite avisos con la app cerrada.");
  if (!pushConfigurado()) throw new Error("Los avisos todavía no están configurados en la app.");
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") {
    throw new Error(
      permiso === "denied"
        ? "Bloqueaste las notificaciones para Taros Money. Habilitalas en los ajustes del navegador y probá de nuevo."
        : "Para recibir avisos tenés que tocar «Permitir».",
    );
  }
  const reg = await registro();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) });
  try {
    return await activarPushBackend(sub.toJSON());
  } catch (err) {
    // Si el backend no la guardó, no dejar una suscripción suelta.
    await sub.unsubscribe().catch(() => {});
    throw err;
  }
}

export async function desactivarPush() {
  const sub = await suscripcionActual();
  if (!sub) return;
  await desactivarPushBackend(sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

// Recordatorios de servicios sin pedir permisos nuevos de Google:
// 1. Notificación del sistema al abrir la app si hay servicios vencidos o que
//    vencen en pocos días (una sola vez por día).
// 2. Link para crear un evento mensual en Google Calendar, que avisa en el
//    celu aunque la app esté cerrada.
const CLAVE_ULTIMO_AVISO = "taros-aviso-servicios";

export function notificacionesDisponibles() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permisoNotificaciones() {
  return notificacionesDisponibles() ? Notification.permission : "denied";
}

export async function pedirPermisoNotificaciones() {
  if (!notificacionesDisponibles()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function hoyClave() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function textoAviso(urgentes) {
  const vencidos = urgentes.filter((s) => s.estado === "vencido");
  const pronto = urgentes.filter((s) => s.estado === "pronto");
  const partes = [];
  if (vencidos.length) partes.push(`Vencido: ${vencidos.map((s) => s.nombre).join(", ")}`);
  if (pronto.length) partes.push(`Vence pronto: ${pronto.map((s) => s.nombre).join(", ")}`);
  return partes.join(". ");
}

// Recibe la lista ya con estado (serviciosConEstado). Muestra la
// notificación como mucho una vez por día y solo si ya dio permiso.
export async function avisarServiciosUrgentes(lista) {
  if (permisoNotificaciones() !== "granted") return;
  const urgentes = (lista || []).filter((s) => s.estado === "vencido" || s.estado === "pronto");
  if (urgentes.length === 0) return;
  try {
    if (localStorage.getItem(CLAVE_ULTIMO_AVISO) === hoyClave()) return;
    localStorage.setItem(CLAVE_ULTIMO_AVISO, hoyClave());
  } catch {
    /* sin storage: puede avisar más de una vez, no es grave */
  }
  const titulo = urgentes.length === 1 ? `Te falta pagar ${urgentes[0].nombre}` : `Te faltan pagar ${urgentes.length} servicios`;
  const opciones = { body: textoAviso(urgentes), icon: "/icon-192.png", badge: "/icon-192.png", tag: "taros-servicios" };
  try {
    // En el celu solo funciona a través del service worker.
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.showNotification) await reg.showNotification(titulo, opciones);
    else new Notification(titulo, opciones);
  } catch {
    /* si el navegador no deja, la tarjeta del Resumen ya lo muestra */
  }
}

// Evento de todo el día que se repite todos los meses el día del
// vencimiento. Si vence después del 28, se usa el último día del mes (no
// todos los meses tienen 29, 30 o 31).
export function linkCalendario(servicio) {
  const dia = Math.min(Math.max(Number(servicio.diaVencimiento) || 1, 1), 31);
  const hoy = new Date();
  const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), dia > 28 ? ultimo : dia);
  const fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1);
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Pagar ${servicio.nombre}`,
    dates: `${fmt(inicio)}/${fmt(fin)}`,
    details: `Cuando lo pagues, marcalo en Taros Money: ${window.location.origin}`,
    recur: `RRULE:FREQ=MONTHLY;BYMONTHDAY=${dia > 28 ? -1 : dia}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Notificaciones del sistema (las que aparecen en la barra del celu o en la
// esquina de la compu). Solo funcionan con la app abierta o en segundo plano
// reciente: con la app cerrada, el aviso de los mails llega por mail.

export function notificacionesSoportadas() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permisoNotificaciones() {
  return notificacionesSoportadas() ? Notification.permission : "denied";
}

// Tiene que llamarse desde un click: los navegadores ignoran el pedido si no.
export async function pedirPermisoNotificaciones() {
  if (!notificacionesSoportadas()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

// En celulares el constructor Notification no anda: hay que mostrarla desde
// el service worker de la PWA. Si nada de eso está, no hace nada.
export async function notificar(titulo, cuerpo) {
  if (permisoNotificaciones() !== "granted") return;
  const opciones = { body: cuerpo, icon: "/icon-192.png", badge: "/icon-192.png", tag: "taros-mails" };
  try {
    const registro = await navigator.serviceWorker?.getRegistration();
    if (registro) {
      await registro.showNotification(titulo, opciones);
      return;
    }
    new Notification(titulo, opciones);
  } catch {
    /* sin notificación: el aviso dentro de la app ya se mostró */
  }
}

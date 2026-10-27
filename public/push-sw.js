// Se suma al service worker de la app (vite.config.js → importScripts).
// Muestra los avisos que manda el Apps Script aunque la app esté cerrada, y
// al tocarlos abre la app en la sección que corresponde.
self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { cuerpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(datos.titulo || "Taros Money", {
      body: datos.cuerpo || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: datos.tag || "taros",
      data: { url: typeof datos.url === "string" && datos.url.startsWith("/") ? datos.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) return abierta.navigate(url).then((v) => (v || abierta).focus());
      return self.clients.openWindow(url);
    }),
  );
});

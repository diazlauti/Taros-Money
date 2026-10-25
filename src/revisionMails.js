// Cuántos días para atrás mira cada revisión (el default del proyecto de
// mails cuando la app no manda otro número).
export const DIAS_REVISION_MAILS = 7;

// "2026-10-24 01:58" en hora de Argentina, el mismo formato que guarda el
// proyecto de mails y que entiende haceCuanto().
export function ahoraArgentina(ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day} ${partes.hour}:${partes.minute}`;
}

// La revisión más nueva entre la de este dispositivo y la que cuenta el
// backend (que también ve las del automático con la app cerrada). Con un
// backend viejo solo llega la hora: se muestra eso.
export function ultimaRevisionMails(local, config) {
  const remota = config?.ultimoResultado || (config?.ultimaRevision ? { cuando: config.ultimaRevision } : null);
  if (!local) return remota;
  if (!remota) return local;
  return String(remota.cuando || "") > String(local.cuando || "") ? remota : local;
}

export const OPCIONES_DIAS_MAILS = [7, 14, 30];
const DIAS_KEY = "taros-mails-dias";

// Cuántos días revisar con el botón: se recuerda en este dispositivo.
export function diasMailsGuardados() {
  try {
    const n = Number(localStorage.getItem(DIAS_KEY));
    return OPCIONES_DIAS_MAILS.includes(n) ? n : DIAS_REVISION_MAILS;
  } catch {
    return DIAS_REVISION_MAILS;
  }
}

export function guardarDiasMails(dias) {
  try {
    localStorage.setItem(DIAS_KEY, String(dias));
  } catch {
    /* storage bloqueado: vuelve a 7 la próxima vez, sin drama */
  }
}

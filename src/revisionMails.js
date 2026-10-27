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

// Lo que la revisión no pudo leer, para avisarlo en vez de perderlo en
// silencio. noLeidos: mails de Mercado Pago con asunto de pago pero sin un
// monto que se entienda (casi siempre es que cambiaron el texto del mail).
// fallaron: lectores que se rompieron; lo suyo entra en la próxima revisión.
// Un backend viejo no manda ninguno de los dos: no se muestra nada.
export function avisosRevisionMails(revision) {
  if (!revision || revision.error) return [];
  const avisos = [];
  const noLeidos = Number(revision.noLeidos) || 0;
  if (noLeidos > 0) {
    avisos.push(
      noLeidos === 1
        ? "No pude leer 1 mail de Mercado Pago y no se cargó. Cargalo a mano y avisanos."
        : `No pude leer ${noLeidos} mails de Mercado Pago y no se cargaron. Cargalos a mano y avisanos.`,
    );
  }
  const fallaron = Array.isArray(revision.fallaron) ? revision.fallaron.filter(Boolean) : [];
  if (fallaron.length > 0) {
    avisos.push(`Esta vez no pude revisar ${fallaron.join(" ni ")}. Lo intento de nuevo en la próxima revisión.`);
  }
  return avisos.concat(avisosRemitentes(revision));
}

// Qué pasó con cada remitente que agregó la persona. Si no llegó ningún mail
// suyo, lo más probable es que le escriba a otra casilla (pasa mucho con
// Steam o las apps de delivery); si llegaron pero ninguno era una compra,
// puede que el formato no se entienda.
export function avisosRemitentes(revision) {
  const lista = Array.isArray(revision?.remitentes) ? revision.remitentes : [];
  const dias = revision?.dias ? ` en los últimos ${revision.dias} días` : "";
  return lista
    .map((r) => {
      if (!r?.remitente) return null;
      if (r.mails === 0 && !r.llegoAlgo) {
        return `De ${r.remitente} no llegó ningún mail${dias}. Fijate que te escriba a este Gmail y no a otra casilla.`;
      }
      if (r.mails > 0 && r.compras === 0) {
        return r.mails === 1
          ? `De ${r.remitente} llegó 1 mail${dias}, pero no era una compra con monto.`
          : `De ${r.remitente} llegaron ${r.mails} mails${dias}, pero ninguno era una compra con monto.`;
      }
      return null;
    })
    .filter(Boolean);
}

// Qué dice la cabeza de la tarjeta de mails. Manda lo que falta revisar
// AHORA (sale de la lista de movimientos), no lo que encontró la última
// revisión: antes, después de descartar el único gasto seguía diciendo
// "¡Encontré 1 movimiento!".
// modo: "revisando" | "error" | "pendientes" | "cargando" | "nunca" | "al-dia".
export function estadoBandeja({ revision, pendientes = 0, revisando = false, cargandoPendientes = false }) {
  if (revisando) return { modo: "revisando", titulo: "Revisando tus mails…" };
  if (revision?.error) return { modo: "error", titulo: "No pude revisar tus mails", detalle: revision.error };
  if (pendientes > 0) {
    return {
      modo: "pendientes",
      titulo: pendientes === 1 ? "1 movimiento para revisar" : `${pendientes} movimientos para revisar`,
    };
  }
  const nuevos = Number(revision?.nuevos) || 0;
  // Recién terminó y la lista todavía se está recargando: no decir "al día".
  if (nuevos > 0 && cargandoPendientes) {
    return { modo: "cargando", titulo: nuevos === 1 ? "¡Encontré 1 movimiento!" : `¡Encontré ${nuevos} movimientos!` };
  }
  if (!revision) return { modo: "nunca", titulo: "Todavía no revisé tus mails" };
  let detalle = "no había nada nuevo";
  if (nuevos > 0) detalle = nuevos === 1 ? "encontré 1 y ya lo revisaste" : `encontré ${nuevos} y ya los revisaste`;
  else if (revision.revisados === 0) detalle = "no encontré mails de compras";
  else if (revision.yaEstaban > 0) detalle = `nada nuevo (${revision.yaEstaban} ya estaban cargados)`;
  return { modo: "al-dia", titulo: "Estás al día", detalle };
}

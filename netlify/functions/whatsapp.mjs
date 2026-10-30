// Bot de WhatsApp: le mandás "café 2500" y lo anota en tu bandeja para
// confirmar (como los gastos de los mails). Fase 1: solo texto.
//
// Sin librerías: solo fetch y crypto de Node. Meta llama a esta función con
// cada mensaje (webhook). Acá se lee el texto, se le pasa al Apps Script (que
// guarda el gasto en la fila de espera de esa persona) y se contesta por
// WhatsApp. El número de teléfono nunca llega al Apps Script: va una huella
// (hash) que no se puede dar vuelta.
//
// Variables de entorno en Netlify:
//   WA_VERIFY_TOKEN  la palabra que se pone en Meta al configurar el webhook
//   WA_APP_SECRET    "Clave secreta de la app" de Meta (para chequear la firma)
//   WA_TOKEN         token de acceso de WhatsApp (para contestar)
//   WA_SCRIPT_URL    URL de la implementación "Aplicación web" del Apps Script
//   WA_SECRET        clave larga inventada, la misma que en el Apps Script
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v23.0";
const MAX_TEXTO = 500;
const MAX_LINEAS = 10;
const MAX_MONTO = 1e10;
// Argentina no cambia la hora en verano: siempre UTC-3.
const DESFASE_AR_MS = -3 * 60 * 60 * 1000;

// ------------ Leer el texto ------------

const MONEDAS = [
  [/^(?:usd|u\$s|us\$|u\$d|d[oó]lar(?:es)?|dolar(?:es)?|verdes?)$/i, "USD"],
  [/^(?:eur|euros?|€)$/i, "EUR"],
  [/^(?:brl|reales?|r\$)$/i, "BRL"],
  [/^(?:clp)$/i, "CLP"],
  [/^(?:ars|pesos?|mangos?)$/i, "ARS"],
];

const NUMERO = /(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k|mil|lucas?)?(?![\d\p{L}])/giu;

// "2.500" y "2,500" son dos mil quinientos; "2,5" y "2.50" llevan decimales;
// "2.500,50" (o "2,500.50") tiene los dos.
export function leerNumero(texto) {
  const t = String(texto);
  const ultimoPunto = t.lastIndexOf(".");
  const ultimaComa = t.lastIndexOf(",");
  let limpio;
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    const decimal = ultimoPunto > ultimaComa ? "." : ",";
    const miles = decimal === "." ? "," : ".";
    limpio = t.split(miles).join("").replace(decimal, ".");
  } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
    const sep = ultimoPunto >= 0 ? "." : ",";
    const partes = t.split(sep);
    const miles = partes.length > 2 || partes[partes.length - 1].length === 3;
    limpio = miles ? partes.join("") : partes.join(".");
  } else {
    limpio = t;
  }
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function fechaHoraAr(ms, restarDias = 0) {
  const d = new Date(ms + DESFASE_AR_MS - restarDias * 86400000);
  const iso = d.toISOString();
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) };
}

const PALABRAS_DIA = [
  [/(?<!\p{L})(?:antes de ayer|anteayer|antier)(?!\p{L})/iu, 2],
  [/(?<!\p{L})ayer(?!\p{L})/iu, 1],
  [/(?<!\p{L})hoy(?!\p{L})/iu, 0],
];

const RELLENO_INICIO = /^(?:(?:gast[eé]|pagu[eé]|compr[eé]|puse|fueron|son|en|de|del|por|un|una|el|la|los|las)\s+)+/iu;
const RELLENO_FIN = /\s+(?:en|de|del|por|con)$/i;

function limpiarDescripcion(texto) {
  let d = texto.replace(/\s+/g, " ").trim();
  for (let i = 0; i < 3; i++) d = d.replace(RELLENO_INICIO, "").replace(RELLENO_FIN, "").trim();
  d = d.replace(/^[\s,.;:\-–—]+|[\s,.;:\-–—]+$/g, "").trim();
  if (!d) return "";
  return (d.charAt(0).toUpperCase() + d.slice(1)).slice(0, 80);
}

// Una línea: "café 2500", "uber 3.800 ayer", "netflix usd 12", "2,5k super".
// Devuelve { monto, moneda, descripcion, fecha, hora } o null si no hay monto.
export function leerGasto(linea, ahoraMs = Date.now()) {
  let texto = String(linea || "").slice(0, MAX_TEXTO);

  let dias = 0;
  for (const [patron, valor] of PALABRAS_DIA) {
    if (patron.test(texto)) {
      dias = Math.max(dias, valor);
      texto = texto.replace(patron, " ");
    }
  }

  // El número más grande es el monto ("2 cafés 3000", "cuota 3 de 12 45000").
  let mejor = null;
  for (const m of texto.matchAll(NUMERO)) {
    let valor = leerNumero(m[1]);
    if (valor === null) continue;
    if (m[2]) valor *= 1000;
    if (!mejor || valor > mejor.valor) mejor = { valor, inicio: m.index, fin: m.index + m[0].length };
  }
  if (!mejor || !(mejor.valor > 0) || mejor.valor >= MAX_MONTO) return null;

  let resto = `${texto.slice(0, mejor.inicio)} ${texto.slice(mejor.fin)}`;
  let moneda = "ARS";
  const palabras = resto
    .replace(/\$/g, " $ ")
    .split(/\s+/)
    .filter((p) => {
      if (!p || p === "$") return false;
      const limpia = p.replace(/[.,;:!?]+$/, "");
      for (const [patron, codigo] of MONEDAS) {
        if (patron.test(limpia)) {
          moneda = codigo;
          return false;
        }
      }
      return true;
    });
  resto = palabras.join(" ");

  const monto = Math.round(mejor.valor * 100) / 100;
  return {
    monto,
    moneda,
    descripcion: limpiarDescripcion(resto) || "Gasto por WhatsApp",
    ...fechaHoraAr(ahoraMs, dias),
  };
}

const ES_INGRESO = /^\s*(?:cobr[eé]|me pagaron|me (?:entr[oó]|entraron|depositaron|transfirieron)|ingreso|ingres[oó])(?!\p{L})/iu;
const ES_AYUDA = /^\s*(?:ayuda|help|hola|buenas|buen d[ií]a|\?+|men[uú]|c[oó]mo (?:funciona|se usa))\s*[!.?]*\s*$/i;
const ES_DESVINCULAR = /^\s*(?:desvincular|desvinculame|salir|baja)\s*[!.]*\s*$/i;
const CODIGO = /\bTAROS[-\s]?([A-Z0-9]{6})\b/i;

// Qué quiso decir el mensaje entero.
export function leerMensaje(texto, ahoraMs = Date.now()) {
  const t = String(texto || "").slice(0, MAX_TEXTO);
  const codigo = t.match(CODIGO);
  if (codigo) return { tipo: "vincular", codigo: codigo[1].toUpperCase() };
  if (ES_DESVINCULAR.test(t)) return { tipo: "desvincular" };
  if (ES_AYUDA.test(t)) return { tipo: "ayuda" };

  const lineas = t
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINEAS);
  if (lineas.length === 0) return { tipo: "ayuda" };
  if (lineas.every((l) => ES_INGRESO.test(l))) return { tipo: "ingreso" };

  const gastos = [];
  let sinMonto = 0;
  lineas.forEach((l) => {
    if (ES_INGRESO.test(l)) return;
    const g = leerGasto(l, ahoraMs);
    if (g) gastos.push(g);
    else sinMonto++;
  });
  if (gastos.length === 0) return { tipo: "sin_monto" };
  return { tipo: "gastos", gastos, sinMonto };
}

// ------------ Respuestas ------------

const URL_APP = process.env.URL || "https://tarosmoney.netlify.app";

const SIMBOLOS = { ARS: "$", USD: "US$", EUR: "€", BRL: "R$", CLP: "CLP$" };

export function fmtMonto(monto, moneda = "ARS") {
  const conDecimales = Math.round(monto) !== monto;
  const texto = monto.toLocaleString("es-AR", {
    minimumFractionDigits: conDecimales ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${SIMBOLOS[moneda] || "$"}${texto}`;
}

const AYUDA =
  "Mandame tus gastos así:\n• café 2500\n• uber 3.800 ayer\n• netflix usd 12\n\nUno por línea si son varios. Los anoto en Taros Money y vos los confirmás en la app.";

export function textoRespuesta(leido, resultado) {
  const estado = resultado?.estado;
  if (estado === "error") return "Ahora no pude anotarlo. Probá de nuevo en un rato.";
  if (estado === "no_vinculado") {
    return `¡Hola! Soy el bot de Taros Money. Para usarme, vinculá este WhatsApp desde la app: Configuración › Gastos › WhatsApp.\n${URL_APP}`;
  }
  if (leido.tipo === "vincular") {
    if (estado === "vinculado") return `¡Listo, quedó vinculado! 🎉\n\n${AYUDA}`;
    return "Ese código no sirve o ya venció. Pedí uno nuevo en la app: Configuración › Gastos › WhatsApp.";
  }
  if (leido.tipo === "desvincular") return "Listo, desvinculé este WhatsApp. Si querés volver, vinculalo desde la app.";
  if (leido.tipo === "ayuda") return AYUDA;
  if (leido.tipo === "ingreso") return "Por ahora anoto solo gastos. Los ingresos cargalos en la app.";
  if (leido.tipo === "sin_monto") return `No encontré el monto. ${AYUDA}`;
  if (estado === "cola_llena") {
    return `Tenés muchos gastos esperando. Abrí la app para que entren y después seguí mandando.\n${URL_APP}/?ver=revisar`;
  }
  const lista = leido.gastos.map((g) => `• ${fmtMonto(g.monto, g.moneda)} · ${g.descripcion}`).join("\n");
  const titulo = leido.gastos.length === 1 ? "Anotado ✓" : `Anoté ${leido.gastos.length} ✓`;
  const aviso = leido.sinMonto ? `\n\n${leido.sinMonto === 1 ? "Una línea no tenía" : `${leido.sinMonto} líneas no tenían`} monto y la salteé.` : "";
  const confirmar = leido.gastos.length === 1 ? "Confirmalo" : "Confirmalos";
  return `${titulo}\n${lista}${aviso}\n\n${confirmar} en la app: ${URL_APP}/?ver=revisar`;
}

// ------------ Meta y Apps Script ------------

function iguales(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function firmaValida(cuerpo, firma, secreto) {
  if (!firma || !secreto) return false;
  const esperada = "sha256=" + createHmac("sha256", secreto).update(cuerpo, "utf8").digest("hex");
  return iguales(esperada, firma);
}

function huella(telefono, secreto) {
  return createHash("sha256").update(`taros-wa:${secreto}:${telefono}`).digest("base64url").slice(0, 32);
}

async function pedirAlScript(datos) {
  try {
    const res = await fetch(process.env.WA_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ secreto: process.env.WA_SECRET, ...datos }),
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return data && data.estado ? data : { estado: "error" };
  } catch (err) {
    console.error("El Apps Script no respondió:", err?.message || err);
    return { estado: "error" };
  }
}

async function contestar(phoneNumberId, para, texto) {
  try {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: para,
        type: "text",
        text: { body: texto, preview_url: false },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("WhatsApp no aceptó la respuesta:", res.status, (await res.text()).slice(0, 300));
  } catch (err) {
    console.error("No pude contestar por WhatsApp:", err?.message || err);
  }
}

async function procesar(mensaje, phoneNumberId) {
  const tel = huella(mensaje.from, process.env.WA_SECRET);
  const ahoraMs = Number(mensaje.timestamp) * 1000 || Date.now();

  if (mensaje.type !== "text") {
    const queEs = mensaje.type === "audio" ? "audios" : mensaje.type === "image" ? "fotos" : "eso";
    await contestar(phoneNumberId, mensaje.from, `Por ahora solo leo texto, todavía no ${queEs}. Mandame algo como «café 2500».`);
    return;
  }

  const leido = leerMensaje(mensaje.text?.body, ahoraMs);
  let resultado;
  if (leido.tipo === "vincular") {
    resultado = await pedirAlScript({ accion: "vincular", tel, fin: String(mensaje.from).slice(-4), codigo: leido.codigo });
  } else if (leido.tipo === "desvincular") {
    resultado = await pedirAlScript({ accion: "desvincular", tel });
  } else if (leido.tipo === "gastos") {
    resultado = await pedirAlScript({ accion: "gastos", tel, id: mensaje.id, gastos: leido.gastos });
  } else {
    resultado = await pedirAlScript({ accion: "estado", tel });
  }
  await contestar(phoneNumberId, mensaje.from, textoRespuesta(leido, resultado));
}

export default async (req) => {
  const url = new URL(req.url);

  // Meta confirma el webhook una vez con un GET.
  if (req.method === "GET") {
    const token = process.env.WA_VERIFY_TOKEN;
    if (token && url.searchParams.get("hub.mode") === "subscribe" && iguales(url.searchParams.get("hub.verify_token") || "", token)) {
      return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
    }
    return new Response("No", { status: 403 });
  }
  if (req.method !== "POST") return new Response("No", { status: 405 });

  const faltan = ["WA_APP_SECRET", "WA_TOKEN", "WA_SCRIPT_URL", "WA_SECRET"].filter((n) => !process.env[n]);
  if (faltan.length) {
    console.error("Faltan variables de entorno:", faltan.join(", "));
    return new Response("Sin configurar", { status: 503 });
  }

  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get("x-hub-signature-256"), process.env.WA_APP_SECRET)) {
    // Sin datos de nadie: solo para saber si Meta llama y la clave no coincide.
    console.warn(
      `WhatsApp: firma inválida (llegó la cabecera: ${req.headers.get("x-hub-signature-256") ? "sí" : "no"}). ` +
        "Revisá que WA_APP_SECRET sea la «Clave secreta de la app» de Meta, sin espacios, y hacé un deploy nuevo.",
    );
    return new Response("Firma inválida", { status: 401 });
  }

  let datos;
  try {
    datos = JSON.parse(cuerpo);
  } catch {
    return new Response("ok", { status: 200 });
  }

  const tareas = [];
  for (const entrada of datos.entry || []) {
    for (const cambio of entrada.changes || []) {
      const valor = cambio.value || {};
      const phoneNumberId = valor.metadata?.phone_number_id;
      for (const mensaje of valor.messages || []) {
        if (phoneNumberId && mensaje.from) tareas.push(procesar(mensaje, phoneNumberId));
      }
    }
  }
  console.log(`WhatsApp: llegaron ${tareas.length} mensaje(s)`);
  await Promise.all(tareas);
  // Siempre 200: si no, Meta reintenta el mismo mensaje un montón de veces.
  return new Response("ok", { status: 200 });
};

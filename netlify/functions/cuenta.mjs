// Cuenta verificada para las sugerencias y errores.
//
// El mail de quien manda un reporte no lo escribe la persona: la app manda su
// token de Google, acá se le pregunta a Google de quién es (y que sea de esta
// app), y se devuelve el mail con un «sello». Sin el token de esa cuenta no se
// puede sacar un sello válido, así que nadie puede hacerse pasar por otro.
//
// En el mail del reporte va un link «Comprobar» a esta misma función (GET):
// muestra ✔ si el sello coincide con el mail y la fecha, o ✗ si alguien lo
// armó a mano.
//
// Sin librerías: solo fetch y crypto de Node. Usa las mismas variables que la
// sesión larga (GOOGLE_CLIENT_SECRET y el ID del cliente); no hace falta otra.
import { createHmac, timingSafeEqual } from "node:crypto";

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const secreto = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && secreto ? { clientId, secreto } : null;
}

function sellar(email, fecha, secreto) {
  return createHmac("sha256", "taros-cuenta:" + secreto)
    .update(`${email}|${fecha}`)
    .digest("base64url")
    .slice(0, 22);
}

function iguales(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function json(estado, cuerpo) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function fechaLinda(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function pagina(ok, email, fecha) {
  const titulo = ok ? "✔ Cuenta verificada" : "✗ No coincide";
  const texto = ok
    ? `Este reporte lo mandó <strong>${escapar(email)}</strong> desde la app, con su sesión de Google, el ${escapar(fechaLinda(fecha))}.`
    : "El mail o la fecha no coinciden con el sello: este reporte no salió de la app con esa cuenta.";
  const color = ok ? "#1f7a4d" : "#b3261e";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#1a1f45">
<h1 style="color:${color}">${titulo}</h1><p>${texto}</p></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default async function cuenta(req) {
  const cfg = config();

  // Link «Comprobar» del mail.
  if (req.method === "GET") {
    const url = new URL(req.url);
    const email = url.searchParams.get("email") || "";
    const fecha = url.searchParams.get("fecha") || "";
    const sello = url.searchParams.get("sello") || "";
    const ok = !!(cfg && email && fecha && sello && iguales(sello, sellar(email, fecha, cfg.secreto)));
    return pagina(ok, email, fecha);
  }

  if (req.method !== "POST") return json(405, { error: "metodo" });
  if (!cfg) return json(200, { error: "sin_configurar" });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "sin_token" });

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return json(401, { error: "token_invalido" });
    const info = await res.json();
    const deEstaApp = info.aud === cfg.clientId || info.azp === cfg.clientId;
    const verificado = info.email_verified === true || info.email_verified === "true";
    if (!deEstaApp || !info.email || !verificado) return json(401, { error: "token_invalido" });
    const fecha = new Date().toISOString();
    return json(200, { email: info.email, fecha, sello: sellar(info.email, fecha, cfg.secreto) });
  } catch {
    return json(502, { error: "google" });
  }
}

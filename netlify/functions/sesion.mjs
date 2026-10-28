// Sesión larga con Google: guarda el "permiso largo" (refresh token) en una
// cookie cifrada que el JavaScript de la página no puede leer, y con él saca
// tokens nuevos de una hora sin abrir ninguna ventanita de Google.
//
// Sin librerías: solo fetch y crypto de Node. Necesita en Netlify la variable
// GOOGLE_CLIENT_SECRET (el secreto del mismo cliente OAuth que la app). Si
// falta, responde "sin_configurar" y la app sigue con el login de antes.
//
// Acciones (todas POST, solo desde la propia página):
//   estado   → { configurada }
//   entrar   → { code } del login de Google → token de una hora + guarda la cookie
//   renovar  → token de una hora nuevo a partir de la cookie
//   salir    → revoca el permiso largo y borra la cookie
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const COOKIE = "taros_sesion";
const RUTA_COOKIE = "/.netlify/functions/sesion";
// Google igual vence el permiso largo antes si la app sigue "en prueba" (7
// días) o si la persona lo revoca; esto es solo el techo de la cookie.
const DURACION_COOKIE_S = 60 * 60 * 24 * 180;

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const secreto = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && secreto ? { clientId, secreto } : null;
}

function responder(estado, cuerpo, cookie) {
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  if (cookie !== undefined) headers["Set-Cookie"] = cookie;
  return new Response(JSON.stringify(cuerpo), { status: estado, headers });
}

function armarCookie(valor, maxAge) {
  return `${COOKIE}=${valor}; Path=${RUTA_COOKIE}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}
const COOKIE_BORRADA = armarCookie("", 0);

// La clave sale del secreto del cliente: no hace falta otra variable más.
function clave(secreto) {
  return createHash("sha256").update("taros-sesion:" + secreto).digest();
}

function cifrar(texto, secreto) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave(secreto), iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), datos]).toString("base64url");
}

function descifrar(valor, secreto) {
  try {
    const crudo = Buffer.from(valor, "base64url");
    const d = createDecipheriv("aes-256-gcm", clave(secreto), crudo.subarray(0, 12));
    d.setAuthTag(crudo.subarray(12, 28));
    return Buffer.concat([d.update(crudo.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

function leerCookie(req) {
  const todas = req.headers.get("cookie") || "";
  for (const parte of todas.split(";")) {
    const [nombre, ...resto] = parte.trim().split("=");
    if (nombre === COOKIE) return resto.join("=");
  }
  return null;
}

async function pedirAGoogle(parametros) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parametros),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function mailDe(accessToken) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return "";
    return (await res.json()).email || "";
  } catch {
    return "";
  }
}

export default async function sesion(req) {
  if (req.method !== "POST") return responder(405, { error: "metodo" });
  // Un pedido con este encabezado desde otro sitio necesita permiso CORS
  // (que no damos), y la cookie además es SameSite=Strict.
  if (req.headers.get("x-taros") !== "1") return responder(403, { error: "origen" });

  const accion = new URL(req.url).searchParams.get("accion");
  const cfg = config();
  if (accion === "estado") return responder(200, { configurada: !!cfg });
  if (!cfg) return responder(503, { error: "sin_configurar" });

  try {
    if (accion === "entrar") {
      const { code } = await req.json().catch(() => ({}));
      if (!code || typeof code !== "string") return responder(400, { error: "falta_codigo" });
      const { ok, data } = await pedirAGoogle({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.secreto,
        // En el modo ventanita de Google el redirect_uri es siempre este.
        redirect_uri: "postmessage",
        grant_type: "authorization_code",
      });
      if (!ok || !data.access_token) return responder(400, { error: data.error || "codigo_invalido" });
      const email = await mailDe(data.access_token);
      const cuerpo = {
        access_token: data.access_token,
        expires_in: data.expires_in,
        scope: data.scope,
        email,
        persistente: !!data.refresh_token,
      };
      // Sin permiso largo nuevo (Google solo lo da la primera vez) se borra
      // la cookie vieja: podría ser de otra cuenta.
      const cookie = data.refresh_token
        ? armarCookie(cifrar(JSON.stringify({ rt: data.refresh_token, email }), cfg.secreto), DURACION_COOKIE_S)
        : COOKIE_BORRADA;
      return responder(200, cuerpo, cookie);
    }

    const guardada = leerCookie(req);
    const datos = guardada ? JSON.parse(descifrar(guardada, cfg.secreto) || "null") : null;

    if (accion === "renovar") {
      if (!datos?.rt) return responder(401, { error: "sin_sesion" }, guardada ? COOKIE_BORRADA : undefined);
      const { ok, data } = await pedirAGoogle({
        refresh_token: datos.rt,
        client_id: cfg.clientId,
        client_secret: cfg.secreto,
        grant_type: "refresh_token",
      });
      if (!ok || !data.access_token) {
        // invalid_grant = venció o lo revocaron: no sirve más.
        if (data.error === "invalid_grant") return responder(401, { error: "vencida" }, COOKIE_BORRADA);
        return responder(502, { error: "google" });
      }
      return responder(200, {
        access_token: data.access_token,
        expires_in: data.expires_in,
        scope: data.scope,
        email: datos.email || "",
      });
    }

    if (accion === "salir") {
      if (datos?.rt) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token: datos.rt }),
        }).catch(() => {});
      }
      return responder(200, { ok: true }, COOKIE_BORRADA);
    }

    return responder(400, { error: "accion" });
  } catch {
    return responder(502, { error: "google" });
  }
}

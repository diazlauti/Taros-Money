// Manda notificaciones push (Web Push) a los celus y compus que las
// activaron. La llama solo el Apps Script de la API, con una clave
// compartida: Apps Script no sabe firmar ni cifrar estos mensajes, por eso
// existe esta función. Usa solo lo que trae Node (sin dependencias).
//
// Variables de entorno (Netlify → Configuración del sitio → Variables):
//   VAPID_PUBLIC_KEY   clave pública (la misma que VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY  clave privada (nunca va en el front)
//   VAPID_SUBJECT      mailto:tu-mail@ejemplo.com (lo pide el estándar)
//   PUSH_SECRET        clave que comparte con el Apps Script
//
// Pedido: POST { secreto, suscripciones: [{ endpoint, keys: { p256dh, auth } }],
//                titulo, cuerpo, url, tag }
// Respuesta: { resultados: [{ endpoint, ok, vencida }] }. "vencida" quiere
// decir que ese dispositivo ya no acepta avisos y hay que borrarlo.
import crypto from "node:crypto";

const MAX_SUSCRIPCIONES = 10;
const MAX_TEXTO = 300;

// Solo los servicios de push de los navegadores (evita que se use para
// pegarle a cualquier dirección).
const HOSTS_PUSH = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /\.push\.apple\.com$/,
  /\.notify\.windows\.com$/,
];

export function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function desdeB64url(texto) {
  return Buffer.from(String(texto).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function hmac(clave, datos) {
  return crypto.createHmac("sha256", clave).update(datos).digest();
}

// Firma VAPID (JWT ES256) para el servicio de push del dispositivo.
export function firmaVapid(endpoint, { publica, privada, sujeto }, ahora = Date.now()) {
  const pub = desdeB64url(publica);
  const clave = crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: privada, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: "jwk",
  });
  const encabezado = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const datos = b64url(
    JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(ahora / 1000) + 12 * 3600, sub: sujeto }),
  );
  const firma = crypto.sign("sha256", Buffer.from(`${encabezado}.${datos}`), { key: clave, dsaEncoding: "ieee-p1363" });
  return `vapid t=${encabezado}.${datos}.${b64url(firma)}, k=${publica}`;
}

// Cifra el mensaje para ese dispositivo (RFC 8291, "aes128gcm"): solo el
// navegador que se suscribió lo puede leer.
export function cifrar(texto, { p256dh, auth }, { sal = crypto.randomBytes(16), ecdh } = {}) {
  const publicaDispositivo = desdeB64url(p256dh);
  const secretoAuth = desdeB64url(auth);
  if (publicaDispositivo.length !== 65 || secretoAuth.length !== 16) throw new Error("claves de suscripción inválidas");

  const propio = ecdh || crypto.createECDH("prime256v1");
  if (!ecdh) propio.generateKeys();
  const publicaPropia = propio.getPublicKey();
  const compartido = propio.computeSecret(publicaDispositivo);

  const prkAuth = hmac(secretoAuth, compartido);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), publicaDispositivo, publicaPropia, Buffer.from([1])]);
  const ikm = hmac(prkAuth, info);
  const prk = hmac(sal, ikm);
  const cek = hmac(prk, Buffer.from("Content-Encoding: aes128gcm\0\x01", "binary")).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from("Content-Encoding: nonce\0\x01", "binary")).subarray(0, 12);

  const cifrador = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const cuerpo = Buffer.concat([cifrador.update(Buffer.concat([Buffer.from(texto, "utf8"), Buffer.from([2])])), cifrador.final(), cifrador.getAuthTag()]);

  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([sal, rs, Buffer.from([publicaPropia.length]), publicaPropia, cuerpo]);
}

function endpointValido(endpoint) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && HOSTS_PUSH.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

function mismoSecreto(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

const recortar = (t) => String(t || "").slice(0, MAX_TEXTO);

function responder(status, datos) {
  return new Response(JSON.stringify(datos), { status, headers: { "Content-Type": "application/json" } });
}

export default async function handler(req) {
  if (req.method !== "POST") return responder(405, { error: "solo POST" });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_SECRET } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !PUSH_SECRET) return responder(500, { error: "faltan las variables de entorno" });

  let pedido;
  try {
    pedido = await req.json();
  } catch {
    return responder(400, { error: "JSON inválido" });
  }
  if (!mismoSecreto(pedido.secreto, PUSH_SECRET)) return responder(401, { error: "clave incorrecta" });

  const suscripciones = Array.isArray(pedido.suscripciones) ? pedido.suscripciones.slice(0, MAX_SUSCRIPCIONES) : [];
  const mensaje = JSON.stringify({
    titulo: recortar(pedido.titulo) || "Taros Money",
    cuerpo: recortar(pedido.cuerpo),
    url: String(pedido.url || "/").startsWith("/") ? String(pedido.url || "/") : "/",
    tag: recortar(pedido.tag) || "taros",
  });
  const vapid = { publica: VAPID_PUBLIC_KEY, privada: VAPID_PRIVATE_KEY, sujeto: VAPID_SUBJECT || "mailto:avisos@tarosmoney.app" };

  const resultados = await Promise.all(
    suscripciones.map(async (s) => {
      const endpoint = s?.endpoint;
      if (!endpointValido(endpoint)) return { endpoint, ok: false, vencida: true };
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: firmaVapid(endpoint, vapid),
            "Content-Encoding": "aes128gcm",
            "Content-Type": "application/octet-stream",
            TTL: "86400",
            Urgency: "normal",
          },
          body: cifrar(mensaje, s.keys || {}),
        });
        // 404/410: el dispositivo se desuscribió o la suscripción venció.
        return { endpoint, ok: res.ok, vencida: res.status === 404 || res.status === 410, status: res.status };
      } catch (err) {
        return { endpoint, ok: false, vencida: /claves de suscripción/.test(err.message), error: err.message };
      }
    }),
  );
  return responder(200, { resultados });
}

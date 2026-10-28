// Bloqueo con huella o Face ID (Configuración › Seguridad).
//
// Usa WebAuthn, lo que ya trae el navegador: al prenderlo se crea una llave
// en el propio celu (o compu) que solo se usa pasando la huella, la cara o el
// PIN de la pantalla. Para desbloquear se le pide al celu que use esa llave;
// si la persona no se verifica, el celu no la entrega.
//
// Todo queda en este dispositivo: no hay servidor que guarde la llave ni
// cambios en Apps Script. Es una traba para que nadie que agarre el celu
// desbloqueado vea tus números; lo que de verdad protege tus datos sigue
// siendo tu cuenta de Google. Por eso, si la huella falla, se puede volver
// a entrar con Google.
const CLAVE = "taros-bloqueo";

// Cuánto tiempo afuera de la app hace falta para que pida la huella al volver.
export const MINUTOS_AFUERA = 5;

function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const datos = crudo ? JSON.parse(crudo) : null;
    return datos?.id ? datos : null;
  } catch {
    return null;
  }
}

export function bloqueoActivo() {
  return !!leer();
}

export function apagarBloqueo() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* ignorar */
  }
}

function aleatorio(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

function aBase64(buffer) {
  let texto = "";
  for (const b of new Uint8Array(buffer)) texto += String.fromCharCode(b);
  return btoa(texto);
}

function deBase64(texto) {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

// Si este dispositivo tiene huella, Face ID o algo parecido que el
// navegador pueda usar. Devuelve false en vez de fallar.
export async function bloqueoDisponible() {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials?.create) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Que la persona se haya verificado (huella, cara o PIN), no solo tocado.
// Es el bit UV del authenticatorData (byte 32, valor 4).
function seVerifico(credencial) {
  const datos = credencial?.response?.authenticatorData;
  if (!datos) return true; // al crearla no viene; ahí ya se exigió userVerification
  return (new Uint8Array(datos)[32] & 0x04) !== 0;
}

// Los errores de WebAuthn pasados a algo entendible.
function mensaje(err, accion) {
  const nombre = err?.name || "";
  if (nombre === "NotAllowedError" || nombre === "AbortError") {
    return accion === "prender"
      ? "Se canceló o se venció el tiempo. Probá de nuevo."
      : "No se pudo verificar. Probá de nuevo.";
  }
  if (nombre === "InvalidStateError") return "Este dispositivo ya tiene una llave de Taros Money. Probá de nuevo.";
  if (nombre === "NotSupportedError") return "Este dispositivo no tiene huella ni Face ID disponible para la app.";
  if (nombre === "SecurityError") return "El navegador no deja usar la huella en esta página.";
  return accion === "prender" ? "No se pudo prender el bloqueo. Probá de nuevo." : "No se pudo verificar. Probá de nuevo.";
}

// Crea la llave (le pide la huella o la cara a la persona) y deja el
// bloqueo prendido. Tiene que dispararlo un toque.
export async function prenderBloqueo(email) {
  let credencial;
  try {
    credencial = await navigator.credentials.create({
      publicKey: {
        challenge: aleatorio(32),
        rp: { name: "Taros Money" },
        user: { id: aleatorio(16), name: email || "Taros Money", displayName: email || "Taros Money" },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "discouraged",
        },
        attestation: "none",
        timeout: 60000,
      },
    });
  } catch (err) {
    throw new Error(mensaje(err, "prender"));
  }
  if (!credencial) throw new Error("No se pudo prender el bloqueo. Probá de nuevo.");
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ id: aBase64(credencial.rawId), desde: Date.now() }));
  } catch {
    throw new Error("Este navegador no deja guardar el bloqueo (¿modo incógnito?).");
  }
}

// Pide la huella o la cara. Resuelve si la persona se verificó; si no,
// falla con un mensaje para mostrar.
export async function desbloquear() {
  const datos = leer();
  if (!datos) return;
  let credencial;
  try {
    credencial = await navigator.credentials.get({
      publicKey: {
        challenge: aleatorio(32),
        allowCredentials: [{ type: "public-key", id: deBase64(datos.id), transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
  } catch (err) {
    throw new Error(mensaje(err, "desbloquear"));
  }
  if (!credencial || !seVerifico(credencial)) {
    throw new Error("No se pudo verificar. Probá de nuevo.");
  }
}

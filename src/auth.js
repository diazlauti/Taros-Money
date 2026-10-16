// Login con Google (Google Identity Services) — reemplaza al PIN de antes.
// No hay backend propio de sesiones ni token fijo: lo que se guarda es un
// Access Token de OAuth que Google emite directo en el navegador, con el
// scope de abajo, y que se manda tal cual en cada pedido a la API de Apps
// Script (ver api.js). Cada quien se loguea con SU cuenta de Google, así
// que del lado del script cada ejecución corre con sus propios permisos —
// no hace falta ningún PIN ni tabla de sesiones nuestra.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const TOKEN_KEY = "taros-google-token";

// Spreadsheets (leer/escribir los gastos) + Drive (crear la planilla "Taros
// Money" la primera vez que alguien entra — igual que DriveApp.createFile
// necesitaba el permiso amplio de Drive y no el restringido "drive.file",
// SpreadsheetApp.create() lo necesita también).
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
].join(" ");

// Permisos extra, solo para quien activa "Gastos desde tus mails": leer el
// Gmail, escribir los gastos que encuentra en su planilla y, en el modo
// "siempre", programar la revisión automática y mandarse a sí mismo el
// aviso por mail (con su dirección, de ahí userinfo.email). Van en otro token (y otro
// proyecto de Apps Script) para no pedírselos a todo el que entra.
const SCOPES_MAILS = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");
const TOKEN_MAILS_KEY = "taros-google-token-mails";

// Un cliente de Google por cada juego de permisos, cada uno con su propia
// promesa pendiente.
const clientes = {};

function obtenerCliente(scopes) {
  if (clientes[scopes]) return clientes[scopes];
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Todavía no cargó el login de Google. Esperá un segundo y probá de nuevo.");
  }
  const cliente = { resolverPendiente: null };
  cliente.tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: scopes,
    callback: (respuesta) => {
      if (cliente.resolverPendiente) {
        cliente.resolverPendiente(respuesta);
        cliente.resolverPendiente = null;
      }
    },
    // Si se cierra la ventana de Google (o el navegador la bloquea), el
    // callback de arriba nunca se llama: sin esto, el botón se quedaba
    // "Entrando…" para siempre.
    error_callback: (falla) => {
      if (cliente.resolverPendiente) {
        cliente.resolverPendiente({ error: falla?.type || "popup_failed_to_open" });
        cliente.resolverPendiente = null;
      }
    },
  });
  clientes[scopes] = cliente;
  return cliente;
}

// Dos pedidos a la vez con los mismos permisos: antes el segundo pisaba al
// primero y ese quedaba colgado para siempre. Ahora uno silencioso espera al
// que ya está en curso, y uno con ventana (un click) reemplaza al anterior,
// que termina enseguida sin token en vez de quedar esperando.
function pedirToken(scopes, prompt) {
  let cliente;
  try {
    cliente = obtenerCliente(scopes);
  } catch (err) {
    return Promise.reject(err);
  }
  if (cliente.enCurso) {
    if (prompt === "none") return cliente.enCurso.promesa;
    const anterior = cliente.resolverPendiente;
    cliente.resolverPendiente = null;
    anterior?.({ error: cliente.enCurso.prompt === "none" ? "interaction_required" : "popup_closed" });
  }
  const pedido = { prompt };
  pedido.promesa = new Promise((resolve, reject) => {
    cliente.resolverPendiente = resolve;
    try {
      cliente.tokenClient.requestAccessToken({ prompt });
    } catch (err) {
      cliente.resolverPendiente = null;
      reject(err);
    }
  }).finally(() => {
    if (cliente.enCurso === pedido) cliente.enCurso = null;
  });
  cliente.enCurso = pedido;
  return pedido.promesa;
}

function guardarToken(respuesta, clave = TOKEN_KEY) {
  // Un minuto de margen antes del vencimiento real, para no mandar un
  // pedido con un token que expira a mitad de camino.
  const vencimiento = Date.now() + (Number(respuesta.expires_in) || 3600) * 1000 - 60000;
  const datos = { token: respuesta.access_token, vencimiento };
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch {
    /* modo privado o storage bloqueado: la sesión no persiste, pero no rompe nada */
  }
  return datos;
}

function leerTokenGuardado(clave = TOKEN_KEY) {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

function borrarToken(clave) {
  const datos = leerTokenGuardado(clave);
  try {
    localStorage.removeItem(clave);
  } catch {
    /* ignorar */
  }
  return datos;
}

export function cerrarSesion() {
  borrarToken(TOKEN_MAILS_KEY);
  const datos = borrarToken(TOKEN_KEY);
  if (datos?.token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(datos.token);
  }
}

export function haySesion() {
  const datos = leerTokenGuardado();
  return !!(datos && datos.vencimiento > Date.now());
}

export function obtenerTokenActual() {
  const datos = leerTokenGuardado();
  return datos && datos.vencimiento > Date.now() ? datos.token : null;
}

// Pasa los códigos de error de Google a algo entendible.
function mensajeDeLogin(codigo) {
  if (codigo === "popup_closed") return "Se cerró la ventana de Google antes de terminar. Probá de nuevo.";
  if (codigo === "popup_failed_to_open") {
    return "El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio y probá de nuevo.";
  }
  if (codigo === "access_denied") return "Para usar la app hace falta que aceptes los permisos de Google.";
  return "No se pudo iniciar sesión con Google. Probá de nuevo.";
}

// Login interactivo: abre el selector de cuenta de Google (y el cartel de
// permisos, la primera vez que esa cuenta entra). Tiene que dispararlo un
// click del usuario — los navegadores bloquean el popup si se llama solo.
export async function iniciarSesionConGoogle() {
  const respuesta = await pedirToken(SCOPES, "");
  if (respuesta.error) throw new Error(mensajeDeLogin(respuesta.error));
  return guardarToken(respuesta);
}

// Intenta renovar el token SIN mostrar nada (sirve para cuando se vuelve a
// abrir la app y la cuenta ya había dado permiso antes) — así no hace falta
// tocar "Iniciar sesión" cada vez que vence la hora del token. Si hace
// falta interacción (primera vez, o permiso revocado), devuelve null en vez
// de fallar, y la app muestra el botón de login normal.
export async function intentarSesionSilenciosa() {
  try {
    const respuesta = await pedirToken(SCOPES, "none");
    return respuesta.error ? null : guardarToken(respuesta);
  } catch {
    return null;
  }
}

// Token para "Gastos desde tus mails". Con interactivo=true abre la ventana
// de Google (la primera vez pide el permiso de leer el Gmail; tiene que
// dispararlo un click). Sin interacción solo usa el guardado o intenta
// renovarlo en silencio, y devuelve null si hace falta volver a dar permiso.
export async function obtenerTokenMails({ interactivo = false } = {}) {
  const guardado = leerTokenGuardado(TOKEN_MAILS_KEY);
  if (guardado && guardado.vencimiento > Date.now()) return guardado.token;
  try {
    const respuesta = await pedirToken(SCOPES_MAILS, interactivo ? "" : "none");
    if (respuesta.error) {
      if (!interactivo) return null;
      if (respuesta.error === "access_denied") {
        throw new Error("Para revisar tus mails hace falta que aceptes el permiso de leer tu Gmail.");
      }
      throw new Error(mensajeDeLogin(respuesta.error));
    }
    return guardarToken(respuesta, TOKEN_MAILS_KEY).token;
  } catch (err) {
    if (!interactivo) return null;
    throw err;
  }
}

export function olvidarTokenMails() {
  borrarToken(TOKEN_MAILS_KEY);
}

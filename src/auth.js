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
//
// Los otros tres son para el aviso por mail de servicios por vencer: mandarse
// el mail a uno mismo, programar que corra solo una vez por día y saber a
// qué mail mandarlo. La API de Apps Script exige que el token cubra TODOS los
// permisos del proyecto, así que se piden siempre (aunque el aviso esté
// apagado).
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

let tokenClient = null;
let resolverPendiente = null;

function obtenerTokenClient() {
  if (tokenClient) return tokenClient;
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Todavía no cargó el login de Google. Esperá un segundo y probá de nuevo.");
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (respuesta) => {
      if (resolverPendiente) {
        resolverPendiente(respuesta);
        resolverPendiente = null;
      }
    },
    // Si se cierra la ventana de Google (o el navegador la bloquea), el
    // callback de arriba nunca se llama: sin esto, el botón se quedaba
    // "Entrando…" para siempre.
    error_callback: (falla) => {
      if (resolverPendiente) {
        resolverPendiente({ error: falla?.type || "popup_failed_to_open" });
        resolverPendiente = null;
      }
    },
  });
  return tokenClient;
}

function guardarToken(respuesta) {
  // Un minuto de margen antes del vencimiento real, para no mandar un
  // pedido con un token que expira a mitad de camino.
  const vencimiento = Date.now() + (Number(respuesta.expires_in) || 3600) * 1000 - 60000;
  const datos = { token: respuesta.access_token, vencimiento };
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(datos));
  } catch {
    /* modo privado o storage bloqueado: la sesión no persiste, pero no rompe nada */
  }
  return datos;
}

function leerTokenGuardado() {
  try {
    const crudo = localStorage.getItem(TOKEN_KEY);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  const datos = leerTokenGuardado();
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignorar */
  }
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
export function iniciarSesionConGoogle() {
  return new Promise((resolve, reject) => {
    try {
      const client = obtenerTokenClient();
      resolverPendiente = (respuesta) => {
        if (respuesta.error) {
          reject(new Error(mensajeDeLogin(respuesta.error)));
          return;
        }
        resolve(guardarToken(respuesta));
      };
      client.requestAccessToken({ prompt: "" });
    } catch (err) {
      reject(err);
    }
  });
}

// Intenta renovar el token SIN mostrar nada (sirve para cuando se vuelve a
// abrir la app y la cuenta ya había dado permiso antes) — así no hace falta
// tocar "Iniciar sesión" cada vez que vence la hora del token. Si hace
// falta interacción (primera vez, o permiso revocado), devuelve null en vez
// de fallar, y la app muestra el botón de login normal.
export function intentarSesionSilenciosa() {
  return new Promise((resolve) => {
    try {
      const client = obtenerTokenClient();
      resolverPendiente = (respuesta) => {
        resolve(respuesta.error ? null : guardarToken(respuesta));
      };
      client.requestAccessToken({ prompt: "none" });
    } catch {
      resolve(null);
    }
  });
}

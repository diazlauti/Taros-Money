// Login con Google (Google Identity Services) — reemplaza al PIN de antes.
// No hay backend propio de sesiones ni token fijo: lo que se guarda es un
// Access Token de OAuth que Google emite directo en el navegador, con el
// scope de abajo, y que se manda tal cual en cada pedido a la API de Apps
// Script (ver api.js). Cada quien se loguea con SU cuenta de Google, así
// que del lado del script cada ejecución corre con sus propios permisos —
// no hace falta ningún PIN ni tabla de sesiones nuestra.
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const TOKEN_KEY = "taros-google-token";

// Spreadsheets: leer/escribir los gastos y también crear la planilla "Taros
// Money" la primera vez (SpreadsheetApp.create() no necesita Drive). Antes se
// pedía además "drive", que da acceso a TODO el Drive de la persona; la API
// no lo usa y si un token se filtraba, alcanzaba para leer o borrar
// cualquier archivo.
//
// Los otros tres son para el aviso por mail de servicios por vencer: mandarse
// el mail a uno mismo, programar que corra solo una vez por día y saber a
// qué mail mandarlo. La API de Apps Script exige que el token cubra TODOS los
// permisos del proyecto, así que se piden siempre (aunque el aviso esté
// apagado).
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/script.send_mail",
  "https://www.googleapis.com/auth/script.scriptapp",
  "https://www.googleapis.com/auth/userinfo.email",
  // Avisos en el celu con la app cerrada: el Apps Script llama a la función
  // de Netlify que los manda.
  "https://www.googleapis.com/auth/script.external_request",
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

// Sesión larga: una función de Netlify (netlify/functions/sesion.mjs) guarda
// el permiso largo de Google en una cookie que esta página no puede leer, y
// con eso renueva el token de una hora sin abrir ninguna ventanita. Si la
// función no está configurada (o no existe, como en `npm run dev`), todo
// sigue como antes: token de una hora y volver a entrar cuando vence.
const URL_SESION = "/.netlify/functions/sesion";
// Con qué cuenta se entró la última vez, para ofrecer "Seguir como …" con un
// solo toque en vez de la pantalla de entrada completa.
const RECORDADO_KEY = "taros-sesion-recordada";

async function llamarSesion(accion, cuerpo) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 15000);
  try {
    const res = await fetch(`${URL_SESION}?accion=${accion}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Taros": "1" },
      body: JSON.stringify(cuerpo || {}),
      signal: control.signal,
    });
    const data = await res.json().catch(() => null);
    return { estado: res.status, data };
  } finally {
    clearTimeout(temporizador);
  }
}

// null mientras no se sabe. El login lo necesita saber ANTES del click (si
// espera al servidor después del click, el navegador bloquea la ventana de
// Google), por eso se pregunta apenas carga la app.
let sesionLarga = null;
const estadoSesionLarga = llamarSesion("estado")
  .then(({ estado, data }) => (sesionLarga = estado === 200 && !!data?.configurada))
  .catch(() => (sesionLarga = false));

// Después de que Google rechace un token, no se renueva solo por un rato:
// si el problema no es el vencimiento (ej: falta un permiso), renovar y
// reintentar daría vueltas para siempre.
let ultimoRechazo = 0;
let renovando = null;

// Pide un token nuevo con la cookie de sesión larga. Devuelve null si no hay
// sesión larga (o venció) en vez de fallar.
export function renovarSesion() {
  if (renovando) return renovando;
  renovando = (async () => {
    try {
      await estadoSesionLarga;
      if (!sesionLarga || Date.now() - ultimoRechazo < 60000) return null;
      const { estado, data } = await llamarSesion("renovar");
      if (estado !== 200 || !data?.access_token) return null;
      recordarSesion(data.email);
      return guardarToken(data);
    } catch {
      return null;
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

function recordarSesion(email) {
  try {
    const previo = sesionRecordada();
    localStorage.setItem(RECORDADO_KEY, JSON.stringify({ email: email || previo?.email || "" }));
  } catch {
    /* sin storage: la próxima vez se ve la pantalla de entrada completa */
  }
}

export function sesionRecordada() {
  try {
    const crudo = localStorage.getItem(RECORDADO_KEY);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function olvidarSesionRecordada() {
  try {
    localStorage.removeItem(RECORDADO_KEY);
  } catch {
    /* ignorar */
  }
}

// El script de Google carga async: si la app arranca o se toca "Entrar"
// antes de que esté, se espera un poco en vez de fallar.
function esperarGoogle(maxMs = 8000) {
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  return new Promise((resolve) => {
    const inicio = Date.now();
    const id = setInterval(() => {
      if (window.google?.accounts?.oauth2 || Date.now() - inicio > maxMs) {
        clearInterval(id);
        resolve(!!window.google?.accounts?.oauth2);
      }
    }, 100);
  });
}

// Login con código (el que da permiso largo): abre la ventana de Google y
// devuelve { code } o { error }. Se arma en el momento, dentro del click.
function pedirCodigo(email) {
  return new Promise((resolve) => {
    try {
      const cliente = window.google.accounts.oauth2.initCodeClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        ux_mode: "popup",
        ...(email ? { login_hint: email } : {}),
        callback: (respuesta) => resolve(respuesta),
        error_callback: (falla) => resolve({ error: falla?.type || "popup_failed_to_open" }),
      });
      cliente.requestCode();
    } catch {
      resolve({ error: "popup_failed_to_open" });
    }
  });
}

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
function pedirToken(scopes, prompt, email) {
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
      cliente.tokenClient.requestAccessToken(email ? { prompt, login_hint: email } : { prompt });
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
  olvidarSesionRecordada();
  if (sesionLarga) llamarSesion("salir").catch(() => {});
}

// Google rechazó el token: se borra el guardado pero NO la sesión larga, así
// la próxima vez (o con "Seguir como …") se entra sin empezar de cero.
export function tokenRechazado() {
  ultimoRechazo = Date.now();
  borrarToken(TOKEN_KEY);
}

export function haySesion() {
  const datos = leerTokenGuardado();
  return !!(datos && datos.vencimiento > Date.now());
}

// El token guardado si sigue vigente; si venció, lo renueva en silencio con
// la sesión larga (sin ventanitas). null si no se pudo.
export async function obtenerTokenActual() {
  const datos = leerTokenGuardado();
  if (datos && datos.vencimiento > Date.now()) return datos.token;
  const nuevos = await renovarSesion();
  return nuevos?.token || null;
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
// Con la sesión larga disponible usa el login con código (Google da el
// permiso largo y la función lo guarda); si no, el de token de una hora.
// `email` (opcional) saltea el selector de cuenta: es el "Seguir como …".
export async function iniciarSesionConGoogle({ email } = {}) {
  // Casi siempre ya está todo listo y esto no espera nada; si el click llegó
  // muy rápido, espera poquito (más y el navegador bloquea la ventana).
  if (!(await esperarGoogle(2000))) {
    throw new Error("Todavía no cargó el login de Google. Esperá un segundo y probá de nuevo.");
  }
  if (sesionLarga === null) await Promise.race([estadoSesionLarga, new Promise((r) => setTimeout(r, 1500))]);
  if (sesionLarga) {
    const respuesta = await pedirCodigo(email);
    if (respuesta.error || !respuesta.code) throw new Error(mensajeDeLogin(respuesta.error));
    let resultado;
    try {
      resultado = await llamarSesion("entrar", { code: respuesta.code });
    } catch {
      throw new Error("No hay conexión o Google no respondió. Revisá tu internet y probá de nuevo.");
    }
    if (resultado.estado !== 200 || !resultado.data?.access_token) {
      throw new Error("No se pudo iniciar sesión con Google. Probá de nuevo.");
    }
    ultimoRechazo = 0;
    recordarSesion(resultado.data.email);
    return guardarToken(resultado.data);
  }
  const respuesta = await pedirToken(SCOPES, "", email);
  if (respuesta.error) throw new Error(mensajeDeLogin(respuesta.error));
  ultimoRechazo = 0;
  recordarSesion(email);
  return guardarToken(respuesta);
}

// Al abrir la app con el token vencido: lo renueva con la sesión larga, sin
// mostrar nada. Antes se pedía a Google con una ventana "invisible", pero el
// navegador la bloquea si no la abre un toque, y además se pedía antes de
// que cargara el script de Google: fallaba siempre y había que volver a
// entrar. Si no se puede, devuelve null y la app muestra "Seguir como …".
export function intentarSesionSilenciosa() {
  return renovarSesion();
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

// Si hay un permiso de mails guardado y vigente. Sirve para lecturas de
// fondo que no valen la pena si hay que pedirle el token a Google: renovarlo
// en silencio igual abre y cierra una ventanita de Google.
export function hayTokenMailsVigente() {
  const guardado = leerTokenGuardado(TOKEN_MAILS_KEY);
  return !!(guardado && guardado.vencimiento > Date.now());
}

export function olvidarTokenMails() {
  borrarToken(TOKEN_MAILS_KEY);
}

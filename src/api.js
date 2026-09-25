// Capa de conexión con el Apps Script de la planilla de gastos.
// VITE_API_URL se configura como variable de entorno de build (en Netlify:
// Site settings > Environment variables). Ya no hay un token fijo acá: en
// vez de eso, la primera vez que se abre la app en cada dispositivo pide un
// PIN (login()) y a cambio recibe un sessionToken que se guarda en
// localStorage — así el "secreto" nunca queda escrito en el código público
// de la app (a diferencia de un token embebido en el build, que cualquiera
// puede ver abriendo las herramientas de desarrollador del navegador).
const API_URL = import.meta.env.VITE_API_URL;
const SESSION_KEY = "taros-session-token";

function getSessionToken() {
  try {
    return localStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}

function setSessionToken(token) {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {
    /* modo privado o storage bloqueado: la sesión no persiste, pero no rompe nada */
  }
}

export function cerrarSesion() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignorar */
  }
}

export function haySesion() {
  return !!getSessionToken();
}

function chequearConfig() {
  if (!API_URL) {
    throw new Error("Falta configurar VITE_API_URL (variable de entorno de build).");
  }
}

function manejarRespuesta(data) {
  if (data.requiereLogin) {
    cerrarSesion();
    // Avisa a la app (sin acoplar esta capa a React) que hay que volver a
    // mostrar el login — por ejemplo si la sesión venció mientras se estaba
    // usando la app, no sólo al arrancarla.
    try {
      window.dispatchEvent(new Event("taros:sesion-vencida"));
    } catch {
      /* SSR o entorno sin window: no debería pasar en esta app, ignorar */
    }
    const err = new Error(data.error || "Tu sesión venció, iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  }
  if (data.error) throw new Error(data.error);
  return data;
}

async function apiGet(accion, params = {}) {
  chequearConfig();
  const url = new URL(API_URL);
  url.searchParams.set("token", getSessionToken());
  url.searchParams.set("accion", accion);
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null) url.searchParams.set(clave, valor);
  });

  const res = await fetch(url.toString());
  return manejarRespuesta(await res.json());
}

async function apiPost(accion, payload = {}) {
  chequearConfig();
  const res = await fetch(API_URL, {
    method: "POST",
    // Content-Type text/plain a propósito: así el navegador lo trata como
    // "simple request" y no dispara el preflight OPTIONS, que el Web App de
    // Apps Script no sabe responder (rompería el POST con CORS).
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: getSessionToken(), accion, ...payload }),
  });
  return manejarRespuesta(await res.json());
}

// --- Login ---

// Antes de mostrar el formulario de login, la app pregunta si ya hay un PIN
// configurado: si no, en vez de pedirlo deja que el usuario elija el suyo.
export async function getEstadoPin() {
  chequearConfig();
  const url = new URL(API_URL);
  url.searchParams.set("accion", "estadoPin");
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return !!data.configurado;
}

export async function login(pin) {
  chequearConfig();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ accion: "login", pin }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  setSessionToken(data.sessionToken);
}

// Primera vez: elegir el PIN de la app. Ya deja logueado (no hace falta
// volver a escribirlo).
export async function configurarPin(pin) {
  chequearConfig();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ accion: "configurarPin", pin }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  setSessionToken(data.sessionToken);
}

export function cambiarPin(pinActual, pinNuevo) {
  return apiPost("cambiarPin", { pinActual, pinNuevo });
}

export function getGastos(dias = 30) {
  return apiGet("gastos", { dias }).then((d) => d.gastos);
}

export function getResumen(dias = 30) {
  return apiGet("resumen", { dias });
}

export function getSaldo() {
  return apiGet("saldo").then((d) => d.saldo);
}

export function getCategorias() {
  return apiGet("categorias").then((d) => d.categorias);
}

export function agregarGasto(gasto) {
  return apiPost("agregarGasto", { gasto });
}

export function editarGasto(criterio, cambios) {
  return apiPost("editarGasto", { criterio, cambios });
}

export function borrarGasto(criterio) {
  return apiPost("borrarGasto", { criterio });
}

export function agregarIngreso(ingreso) {
  return apiPost("agregarIngreso", { ingreso });
}

export function getIngresos(dias = 30) {
  return apiGet("ingresos", { dias }).then((d) => d.ingresos);
}

// --- Cuentas (pestaña "Cuentas" en la planilla, separada de Gastos) ---

export function getCuentas() {
  return apiGet("cuentas").then((d) => d.cuentas);
}

export function crearCuenta(cuenta) {
  return apiPost("crearCuenta", { cuenta });
}

export function ajustarCuenta(nombre, delta) {
  return apiPost("ajustarCuenta", { nombre, delta });
}

// --- Metas de ahorro (pestaña "Metas") ---

export function getMetas() {
  return apiGet("metas").then((d) => d.metas);
}

export function crearMeta(meta) {
  return apiPost("crearMeta", { meta });
}

export function aportarMeta(nombre, monto) {
  return apiPost("aportarMeta", { nombre, monto });
}

// --- Recurrentes (pestaña "Suscripciones", separada de Gastos) ---

export function getSuscripciones() {
  return apiGet("suscripciones").then((d) => d.suscripciones);
}

// --- Reportes: tendencia de ingresos/gastos de los últimos N meses ---

export function getTendencia(meses = 6) {
  return apiGet("tendencia", { meses }).then((d) => d.tendencia);
}

// --- Cotización USD->ARS (la misma que usa el script para matchear gastos en
// dólares), usada acá sólo para convertir el saldo de las cuentas en USD ---

export function getCotizacion() {
  return apiGet("cotizacion").then((d) => d.cotizacionUsdArs);
}

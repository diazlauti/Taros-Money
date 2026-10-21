// Capa de conexión con Apps Script. Ya no hay un Web App propio con doGet/
// doPost: la app llama DIRECTO a la API de Apps Script (scripts.run), que
// ejecuta cada función del backend con el token OAuth de quien está
// logueado — por eso cada quien termina leyendo/escribiendo su propia
// planilla, sin que el backend tenga que saber de PINes ni sesiones.
import { cerrarSesion, obtenerTokenActual } from "./auth";

const SCRIPT_ID = import.meta.env.VITE_APPS_SCRIPT_ID;

function chequearConfig() {
  if (!SCRIPT_ID) {
    console.error("Falta configurar VITE_APPS_SCRIPT_ID (variable de entorno de build).");
    throw new Error("La app no está bien configurada. Avisale a quien la instaló.");
  }
}

function dispararSesionVencida() {
  try {
    window.dispatchEvent(new Event("taros:sesion-vencida"));
  } catch {
    /* SSR o entorno sin window: no debería pasar en esta app, ignorar */
  }
}

const TIEMPO_LIMITE_MS = 20000;
const ESPERAS_REINTENTO_MS = [800, 2000];

const MENSAJE_SIN_RED = "No hay conexión o Google no respondió. Revisá tu internet y probá de nuevo.";
const MENSAJE_LENTO = "Google está tardando demasiado en responder. Probá de nuevo.";
const MENSAJE_GOOGLE = "Google tuvo un problema al responder. Probá de nuevo en un rato.";

// Error que vale la pena reintentar solo (red caída, tiempo agotado, Google
// devolvió un 5xx). Los errores del propio backend (validaciones, "no existe
// esa cuenta") no se reintentan: darían lo mismo.
function errorTransitorio(mensaje) {
  const err = new Error(mensaje);
  err.transitorio = true;
  return err;
}

function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Pasa los mensajes técnicos de Apps Script a algo entendible. Los mensajes
// que tira el backend a propósito ya vienen en castellano y se dejan tal cual.
function mensajeDelBackend(data) {
  const detalle = data.error.details?.[0];
  const crudo = detalle?.errorMessage || data.error.message || "";
  if (/script function not found|not found/i.test(crudo)) {
    return "Esta sección todavía no está disponible en tu planilla.";
  }
  return crudo || "No se pudo completar. Probá de nuevo.";
}

// Llama a una función del backend por nombre, con el token de quien está
// logueado. El cuerpo de la respuesta de scripts.run tiene dos formas
// posibles: { response: { result: ... } } si la función terminó bien, o
// { error: { ... } } si tiró una excepción (el mensaje real viaja adentro
// de error.details[0].errorMessage) o si Google rechazó el pedido entero
// (token vencido, falta un permiso) — eso último viene con status HTTP 401
// o 403 en vez de 200.
async function llamarUnaVez(funcion, parametros) {
  chequearConfig();
  const token = obtenerTokenActual();
  if (!token) {
    dispararSesionVencida();
    const err = new Error("Iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
  let res;
  try {
    res = await fetch(`https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ function: funcion, parameters: parametros, devMode: false }),
      signal: control.signal,
    });
  } catch (err) {
    throw errorTransitorio(err.name === "AbortError" ? MENSAJE_LENTO : MENSAJE_SIN_RED);
  } finally {
    clearTimeout(temporizador);
  }

  if (res.status === 401 || res.status === 403) {
    cerrarSesion();
    dispararSesionVencida();
    const err = new Error("Tu sesión venció. Iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  }

  if (res.status >= 500) throw errorTransitorio(MENSAJE_GOOGLE);

  let data;
  try {
    data = await res.json();
  } catch {
    throw errorTransitorio(MENSAJE_GOOGLE);
  }
  if (data.error) throw new Error(mensajeDelBackend(data));

  return data.response?.result;
}

// Lecturas: se reintentan solas ante fallas de red (no cambian nada, así que
// repetirlas es seguro).
async function leer(funcion, parametros = []) {
  for (let intento = 0; ; intento++) {
    try {
      return await llamarUnaVez(funcion, parametros);
    } catch (err) {
      if (!err.transitorio || intento >= ESPERAS_REINTENTO_MS.length) throw err;
      await esperar(ESPERAS_REINTENTO_MS[intento]);
    }
  }
}

// Escrituras: NO se reintentan solas. Si el pedido llegó pero se cortó la
// respuesta, repetirlo duplicaría el gasto; la interfaz ofrece "Reintentar".
function escribir(funcion, parametros = []) {
  return llamarUnaVez(funcion, parametros);
}

export function getGastos(dias = 30) {
  return leer("obtenerGastosRecientes", [dias]);
}

export function getResumen(dias = 30) {
  return leer("generarResumen", [dias]);
}

export function getSaldo() {
  return leer("obtenerSaldo");
}

export function getCategorias() {
  return leer("obtenerCategorias");
}

export function agregarCategoria(nombre) {
  return escribir("agregarCategoria", [nombre]);
}

export function borrarCategoria(nombre) {
  return escribir("borrarCategoria", [nombre]);
}

export function agregarGasto(gasto) {
  return escribir("agregarGastoManual", [gasto]);
}

export function editarGasto(criterio, cambios) {
  return escribir("editarGasto", [criterio, cambios]);
}

export function borrarGasto(criterio) {
  return escribir("borrarGasto", [criterio]);
}

export function agregarIngreso(ingreso) {
  return escribir("agregarIngresoManual", [ingreso]);
}

export function editarIngreso(criterio, cambios) {
  return escribir("editarIngreso", [criterio, cambios]);
}

export function borrarIngreso(criterio) {
  return escribir("borrarIngreso", [criterio]);
}

export function getIngresos(dias = 30) {
  return leer("obtenerIngresosRecientes", [dias]);
}

// --- Cuentas (pestaña "Cuentas" en la planilla, separada de Gastos) ---

export function getCuentas() {
  return leer("obtenerCuentas");
}

export function crearCuenta(cuenta) {
  return escribir("crearCuenta", [cuenta]);
}

export function ajustarCuenta(nombre, delta) {
  return escribir("ajustarCuenta", [nombre, delta]);
}

// --- Metas de ahorro (pestaña "Metas") ---

export function getMetas() {
  return leer("obtenerMetas");
}

export function crearMeta(meta) {
  return escribir("crearMeta", [meta]);
}

export function aportarMeta(nombre, monto) {
  return escribir("aportarMeta", [nombre, monto]);
}

// --- Suscripciones (pestaña "Suscripciones") ---

export function getSuscripciones() {
  return leer("obtenerSuscripcionesView");
}

export function crearSuscripcion(suscripcion) {
  return escribir("crearSuscripcion", [suscripcion]);
}

export function editarSuscripcion(nombreOriginal, cambios) {
  return escribir("editarSuscripcion", [nombreOriginal, cambios]);
}

export function borrarSuscripcion(nombre) {
  return escribir("borrarSuscripcion", [nombre]);
}

// --- Reportes: tendencia de ingresos/gastos de los últimos N meses ---

export function getTendencia(meses = 6) {
  return leer("obtenerTendencia", [meses]);
}

// --- Cotización USD->ARS, usada para convertir el saldo de cuentas en USD ---

export function getCotizacion() {
  return leer("obtenerCotizacion");
}

// --- Link directo a tu planilla real en Google Sheets ---

export function getUrlPlanilla() {
  return leer("obtenerUrlPlanilla");
}

export function renombrarCuenta(nombreViejo, nombreNuevo) {
  return escribir("renombrarCuenta", [nombreViejo, nombreNuevo]);
}

export function borrarCuenta(nombre) {
  return escribir("borrarCuenta", [nombre]);
}

export function editarMeta(nombreOriginal, cambios) {
  return escribir("editarMeta", [nombreOriginal, cambios]);
}

export function borrarMeta(nombre) {
  return escribir("borrarMeta", [nombre]);
}

// --- Servicios del mes (pestaña "Servicios"): luz, gas, internet… ---
// Cada uno guarda el último mes en que se pagó; si no es el mes actual,
// está pendiente.

export function getServicios() {
  return leer("obtenerServicios");
}

export function crearServicio(servicio) {
  return escribir("crearServicio", [servicio]);
}

export function editarServicio(nombreOriginal, cambios) {
  return escribir("editarServicio", [nombreOriginal, cambios]);
}

export function borrarServicio(nombre) {
  return escribir("borrarServicio", [nombre]);
}

export function pagarServicio(nombre, pago) {
  return escribir("pagarServicio", [nombre, pago]);
}

export function desmarcarServicio(nombre) {
  return escribir("desmarcarServicio", [nombre]);
}

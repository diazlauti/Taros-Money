// Capa de conexión con Apps Script. Ya no hay un Web App propio con doGet/
// doPost: la app llama DIRECTO a la API de Apps Script (scripts.run), que
// ejecuta cada función del backend con el token OAuth de quien está
// logueado — por eso cada quien termina leyendo/escribiendo su propia
// planilla, sin que el backend tenga que saber de PINes ni sesiones.
import { cerrarSesion, obtenerTokenActual } from "./auth";

const SCRIPT_ID = import.meta.env.VITE_APPS_SCRIPT_ID;

function chequearConfig() {
  if (!SCRIPT_ID) {
    throw new Error("Falta configurar VITE_APPS_SCRIPT_ID (variable de entorno de build).");
  }
}

function dispararSesionVencida() {
  try {
    window.dispatchEvent(new Event("taros:sesion-vencida"));
  } catch {
    /* SSR o entorno sin window: no debería pasar en esta app, ignorar */
  }
}

// Llama a una función del backend por nombre, con el token de quien está
// logueado. El cuerpo de la respuesta de scripts.run tiene dos formas
// posibles: { response: { result: ... } } si la función terminó bien, o
// { error: { ... } } si tiró una excepción (el mensaje real viaja adentro
// de error.details[0].errorMessage) o si Google rechazó el pedido entero
// (token vencido, falta un permiso) — eso último viene con status HTTP 401
// o 403 en vez de 200.
async function scriptsRun(funcion, parametros = []) {
  chequearConfig();
  const token = obtenerTokenActual();
  if (!token) {
    dispararSesionVencida();
    const err = new Error("Iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  }

  const res = await fetch(`https://script.googleapis.com/v1/scripts/${SCRIPT_ID}:run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ function: funcion, parameters: parametros, devMode: false }),
  });

  if (res.status === 401 || res.status === 403) {
    cerrarSesion();
    dispararSesionVencida();
    const err = new Error("Tu sesión venció o falta un permiso — iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  }

  const data = await res.json();
  if (data.error) {
    const detalle = data.error.details?.[0];
    throw new Error(detalle?.errorMessage || data.error.message || "Error llamando a la API.");
  }

  return data.response?.result;
}

export function getGastos(dias = 30) {
  return scriptsRun("obtenerGastosRecientes", [dias]);
}

export function getResumen(dias = 30) {
  return scriptsRun("generarResumen", [dias]);
}

export function getSaldo() {
  return scriptsRun("obtenerSaldo");
}

export function getCategorias() {
  return scriptsRun("obtenerCategoriasDelEspacio");
}

export function agregarGasto(gasto) {
  return scriptsRun("agregarGastoManual", [gasto]);
}

export function editarGasto(criterio, cambios) {
  return scriptsRun("editarGasto", [criterio, cambios]);
}

export function borrarGasto(criterio) {
  return scriptsRun("borrarGasto", [criterio]);
}

export function agregarIngreso(ingreso) {
  return scriptsRun("agregarIngresoManual", [ingreso]);
}

export function editarIngreso(criterio, cambios) {
  return scriptsRun("editarIngreso", [criterio, cambios]);
}

export function borrarIngreso(criterio) {
  return scriptsRun("borrarIngreso", [criterio]);
}

export function getIngresos(dias = 30) {
  return scriptsRun("obtenerIngresosRecientes", [dias]);
}

// --- Cuentas (pestaña "Cuentas" en la planilla, separada de Gastos) ---

export function getCuentas() {
  return scriptsRun("obtenerCuentas");
}

export function crearCuenta(cuenta) {
  return scriptsRun("crearCuenta", [cuenta]);
}

export function ajustarCuenta(nombre, delta) {
  return scriptsRun("ajustarCuenta", [nombre, delta]);
}

// --- Metas de ahorro (pestaña "Metas") ---

export function getMetas() {
  return scriptsRun("obtenerMetas");
}

export function crearMeta(meta) {
  return scriptsRun("crearMeta", [meta]);
}

export function aportarMeta(nombre, monto) {
  return scriptsRun("aportarMeta", [nombre, monto]);
}

// --- Suscripciones (pestaña "Suscripciones") ---

export function getSuscripciones() {
  return scriptsRun("obtenerSuscripcionesView");
}

export function crearSuscripcion(suscripcion) {
  return scriptsRun("crearSuscripcion", [suscripcion]);
}

export function editarSuscripcion(nombreOriginal, cambios) {
  return scriptsRun("editarSuscripcion", [nombreOriginal, cambios]);
}

export function borrarSuscripcion(nombre) {
  return scriptsRun("borrarSuscripcion", [nombre]);
}

// --- Reportes: tendencia de ingresos/gastos de los últimos N meses ---

export function getTendencia(meses = 6) {
  return scriptsRun("obtenerTendencia", [meses]);
}

// --- Cotización USD->ARS, usada para convertir el saldo de cuentas en USD ---

export function getCotizacion() {
  return scriptsRun("obtenerCotizacion");
}

// --- Link directo a tu planilla real en Google Sheets ---

export function getUrlPlanilla() {
  return scriptsRun("obtenerUrlPlanilla");
}

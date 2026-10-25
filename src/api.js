// Capa de conexión con Apps Script. Ya no hay un Web App propio con doGet/
// doPost: la app llama DIRECTO a la API de Apps Script (scripts.run), que
// ejecuta cada función del backend con el token OAuth de quien está
// logueado — por eso cada quien termina leyendo/escribiendo su propia
// planilla, sin que el backend tenga que saber de PINes ni sesiones.
import { cerrarSesion, obtenerTokenActual, obtenerTokenMails, olvidarTokenMails } from "./auth";
import { guardarIconosLocales, leerIconosLocales } from "./iconos";

const SCRIPT_ID = import.meta.env.VITE_APPS_SCRIPT_ID;
// Proyecto aparte "Taros Money Mails" (el único que lee Gmail). Si no está
// configurado, la opción de detectar gastos de los mails no aparece.
const SCRIPT_ID_MAILS = import.meta.env.VITE_APPS_SCRIPT_ID_MAILS;

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
const TIEMPO_LIMITE_MAILS_MS = 90000;
const ESPERAS_REINTENTO_MS = [800, 2000];

const MENSAJE_SIN_RED = "No hay conexión o Google no respondió. Revisá tu internet y probá de nuevo.";
const MENSAJE_LENTO = "Google está tardando demasiado en responder. Probá de nuevo.";
export const MENSAJE_FALTA_PERMISO = "Falta que aceptes un permiso nuevo de Google. Volvé a entrar para aceptarlo.";
const MENSAJE_GOOGLE = "Google tuvo un problema al responder. Probá de nuevo en un rato.";

// Cierra la sesión y vuelve al login, que pide todos los permisos de nuevo.
export function volverAEntrar() {
  cerrarSesion();
  dispararSesionVencida();
}

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
  // La sesión se abrió antes de que la app pidiera un permiso nuevo (ej: el
  // del aviso por mail): Google responde con un error técnico en inglés.
  if (/required permissions|do not have permission/i.test(crudo)) {
    return MENSAJE_FALTA_PERMISO;
  }
  return crudo || "No se pudo completar. Probá de nuevo.";
}

// A qué proyecto de Apps Script se llama y con qué token. El principal usa
// el token del login; si Google lo rechaza, la sesión venció. El de mails usa
// su propio token: si falta o lo rechazan, solo hay que volver a dar el
// permiso de Gmail, sin cerrar la sesión de la app.
const API_PRINCIPAL = {
  scriptId: SCRIPT_ID,
  obtenerToken: obtenerTokenActual,
  sinPermiso() {
    dispararSesionVencida();
    const err = new Error("Iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  },
  rechazado() {
    cerrarSesion();
    dispararSesionVencida();
    const err = new Error("Tu sesión venció. Iniciá sesión de nuevo.");
    err.requiereLogin = true;
    throw err;
  },
};

function apiMails(interactivo) {
  return {
    scriptId: SCRIPT_ID_MAILS,
    // Leer varios mails tarda bastante más que una lectura de la planilla.
    tiempoLimite: TIEMPO_LIMITE_MAILS_MS,
    obtenerToken: () => obtenerTokenMails({ interactivo }),
    sinPermiso() {
      const err = new Error("Hace falta que vuelvas a dar permiso para leer tus mails. Hacelo desde Configuración.");
      err.requierePermisoMails = true;
      throw err;
    },
    rechazado() {
      olvidarTokenMails();
      this.sinPermiso();
    },
  };
}

// Llama a una función del backend por nombre, con el token de quien está
// logueado. El cuerpo de la respuesta de scripts.run tiene dos formas
// posibles: { response: { result: ... } } si la función terminó bien, o
// { error: { ... } } si tiró una excepción (el mensaje real viaja adentro
// de error.details[0].errorMessage) o si Google rechazó el pedido entero
// (token vencido, falta un permiso) — eso último viene con status HTTP 401
// o 403 en vez de 200.
async function llamarUnaVez(funcion, parametros, destino = API_PRINCIPAL) {
  chequearConfig();
  const token = await destino.obtenerToken();
  if (!token) destino.sinPermiso();

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), destino.tiempoLimite || TIEMPO_LIMITE_MS);
  let res;
  try {
    res = await fetch(`https://script.googleapis.com/v1/scripts/${destino.scriptId}:run`, {
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

  if (res.status === 401 || res.status === 403) destino.rechazado();

  if (res.status >= 500) throw errorTransitorio(MENSAJE_GOOGLE);

  let data;
  try {
    data = await res.json();
  } catch {
    throw errorTransitorio(MENSAJE_GOOGLE);
  }
  if (data.error) {
    const err = new Error(mensajeDelBackend(data));
    err.noDisponible = /script function not found/i.test(data.error.details?.[0]?.errorMessage || data.error.message || "");
    throw err;
  }

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

// Íconos elegidos para las categorías. Si el backend todavía no tiene el
// archivo de íconos, se guardan en este dispositivo.
export async function getIconosCategorias() {
  try {
    return { iconos: (await leer("obtenerIconosCategorias")) || {} };
  } catch (err) {
    if (!err.noDisponible) throw err;
    return { iconos: leerIconosLocales(), soloEsteDispositivo: true };
  }
}

export async function guardarIconoCategoria(nombre, icono) {
  try {
    return { iconos: (await escribir("guardarIconoCategoria", [nombre, icono])) || {} };
  } catch (err) {
    if (!err.noDisponible) throw err;
    const iconos = { ...leerIconosLocales() };
    if (icono) iconos[nombre] = icono;
    else delete iconos[nombre];
    guardarIconosLocales(iconos);
    return { iconos, soloEsteDispositivo: true };
  }
}

// Le cambia el nombre en la lista y en todo lo que ya la usaba.
export function renombrarCategoria(nombreViejo, nombreNuevo) {
  return escribir("renombrarCategoria", [nombreViejo, nombreNuevo]);
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

// Gastos de mails de remitentes desconocidos: no están en la planilla de
// gastos hasta que la persona los confirma.
export function confirmarGastoDeMail(idMail, gasto) {
  return escribir("confirmarGastoDeMail", [idMail, gasto]);
}

export function confirmarTodosLosDeMails() {
  return escribir("confirmarTodosLosDeMails");
}

export function descartarGastoDeMail(idMail) {
  return escribir("descartarGastoDeMail", [idMail]);
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

// --- Monedas: cuáles usa cada uno y si su cotización es automática o fija ---
// { monedas: { USD: { modo: "auto", tipo: "blue", valor, fecha }, EUR: { modo: "fijo", valor } } }

export async function getMonedas() {
  try {
    return await leer("obtenerMonedas");
  } catch (err) {
    // Backend todavía sin el archivo de monedas: se sigue como antes, solo
    // con el dólar a valor fijo.
    if (!err.noDisponible) throw err;
    const valor = await leer("obtenerCotizacion");
    return { monedas: { USD: { modo: "fijo", valor } }, sinConfigurar: true };
  }
}

export function guardarMonedas(monedas) {
  return escribir("guardarMonedas", [monedas]);
}

// Guarda el último valor automático para que los resúmenes del backend
// conviertan con el mismo número que se ve en pantalla. Repetirlo no
// duplica nada, así que se puede reintentar.
export function guardarCotizacionesAuto(valores) {
  return leer("guardarCotizacionesAuto", [valores]);
}

// --- Link directo a tu planilla real en Google Sheets ---

export function getUrlPlanilla() {
  return leer("obtenerUrlPlanilla");
}

// --- Gastos desde tus mails (proyecto aparte "Taros Money Mails") ---

export function mailsDisponible() {
  return !!SCRIPT_ID_MAILS;
}

// Cuándo revisar los mails: se guarda en la API principal para que valga en
// todos tus dispositivos. modo: "apagado" | "al_abrir" | "boton" | "siempre".
export function getConfigMails() {
  return leer("obtenerConfigMails");
}

export function guardarModoMails(modo) {
  return escribir("guardarModoMails", [modo]);
}

// Las dos de abajo tienen que llamarse directo desde un click cuando
// interactivo=true: la primera vez abren la ventana de permisos de Google.
export function activarMails(planillaId, modo, { interactivo = false } = {}) {
  return llamarUnaVez("activarMails", [planillaId, modo], apiMails(interactivo));
}

// No se reintenta sola: si se cortó la respuesta, la próxima revisión no
// duplica nada (cada mail se carga una sola vez), pero mejor que lo decida
// la persona con "Reintentar".
export function revisarMails(planillaId, dias, { interactivo = false } = {}) {
  return llamarUnaVez("revisarMails", [planillaId, dias], apiMails(interactivo));
}

// Remitentes y palabras propios de cada persona, y si quiere el aviso por
// mail del modo "siempre". Viven en el proyecto de mails porque los usa la
// revisión automática.
// Sin permiso de Gmail a mano no hace falta: lo usa el diálogo después de borrar.
export function ignorarRemitenteMail(nombre) {
  return llamarUnaVez("ignorarRemitenteMail", [nombre], apiMails(false));
}

export function getAjustesMails({ interactivo = false } = {}) {
  return llamarUnaVez("obtenerAjustesMails", [], apiMails(interactivo));
}

export function guardarAjustesMails(ajustes, { interactivo = false } = {}) {
  return llamarUnaVez("guardarAjustesMails", [ajustes], apiMails(interactivo));
}

// El ID de la planilla sale del link que ya devuelve la API.
export function idDePlanilla(url) {
  const match = String(url || "").match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
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

// Aviso diario por mail de servicios vencidos o por vencer.
export function getAvisoServicios() {
  return leer("obtenerAvisoServicios");
}

export function activarAvisoServicios(activo) {
  return escribir("activarAvisoServicios", [activo, window.location.origin]);
}

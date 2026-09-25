// Capa de conexión con el Apps Script de la planilla de gastos.
// VITE_API_URL / VITE_API_TOKEN se configuran como variables de entorno de
// build (en Netlify: Site settings > Environment variables), nunca se pisan
// a mano acá.
const API_URL = import.meta.env.VITE_API_URL;
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

function chequearConfig() {
if (!API_URL || !API_TOKEN) {
throw new Error(
"Falta configurar VITE_API_URL y/o VITE_API_TOKEN (variables de entorno de build)."
);
}
}

async function apiGet(accion, params = {}) {
chequearConfig();
const url = new URL(API_URL);
url.searchParams.set("token", API_TOKEN);
url.searchParams.set("accion", accion);
Object.entries(params).forEach(([clave, valor]) => {
if (valor !== undefined && valor !== null) url.searchParams.set(clave, valor);
});

const res = await fetch(url.toString());
const data = await res.json();
if (data.error) throw new Error(data.error);
return data;
}

async function apiPost(accion, payload = {}) {
chequearConfig();
const res = await fetch(API_URL, {
method: "POST",
// Content-Type text/plain a propósito: así el navegador lo trata como
// "simple request" y no dispara el preflight OPTIONS, que el Web App de
// Apps Script no sabe responder (rompería el POST con CORS).
headers: { "Content-Type": "text/plain;charset=utf-8" },
body: JSON.stringify({ token: API_TOKEN, accion, ...payload }),
});
const data = await res.json();
if (data.error) throw new Error(data.error);
return data;
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
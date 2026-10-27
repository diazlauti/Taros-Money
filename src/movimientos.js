// Cuentas de la pantalla Movimientos: rango de días, filtros, orden,
// agrupado por día y saldo de cada día. Sin React, para poder leerlo solo.
import { aPesos } from "./format";

// "3 días" se filtra acá con lo que ya vino (el backend trae como mínimo 7);
// el resto cambia el período que se le pide al backend.
export const RANGOS = [3, 7, 14, 30, 90];
export const RANGO_LOCAL = 3;

export const ORDENES = [
  ["recientes", "Más nuevos primero"],
  ["antiguos", "Más viejos primero"],
  ["mayor", "Mayor monto primero"],
  ["menor", "Menor monto primero"],
];

const pad2 = (n) => String(n).padStart(2, "0");
const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function fechaISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Primer día que entra en "los últimos N días" contando hoy: con 3 → hoy, ayer y anteayer.
export function desdeHaceDias(n, hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (n - 1));
  return fechaISO(d);
}

// "2026-10-25" → "Hoy", "Ayer", "Sábado 25 de octubre" (con año si no es este).
export function nombreDia(fecha, hoy = new Date()) {
  const m = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "Sin fecha";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const hoyISO = fechaISO(hoy);
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (fecha.slice(0, 10) === hoyISO) return "Hoy";
  if (fecha.slice(0, 10) === fechaISO(ayer)) return "Ayer";
  const dia = DIAS_SEMANA[d.getDay()];
  const texto = `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  return d.getFullYear() === hoy.getFullYear() ? texto : `${texto} de ${d.getFullYear()}`;
}

// "14:59:00" o "9:05" → "14:59" / "09:05". Los ingresos no tienen hora: "".
export function horaCorta(hora) {
  const m = String(hora || "").match(/^(\d{1,2}):(\d{2})/);
  return m ? `${pad2(m[1])}:${m[2]}` : "";
}

// Monto con signo para sumar: los gastos restan.
function conSigno(t) {
  const n = Math.abs(Number(t.monto) || 0);
  return t.tipo === "ingreso" ? n : -n;
}

// Para ordenar por monto entre monedas distintas: lo pasa a pesos si hay cotización.
function montoComparable(t, monedaPorCuenta, cotizaciones) {
  const moneda = monedaPorCuenta[t.cuenta] || "ARS";
  const n = Math.abs(Number(t.monto) || 0);
  return aPesos(n, moneda, cotizaciones) ?? n;
}

const claveFecha = (t) => `${t.fecha || ""} ${horaCorta(t.hora)}`;

export function ordenar(lista, orden, monedaPorCuenta = {}, cotizaciones = {}) {
  const copia = [...lista];
  if (orden === "antiguos") return copia.sort((a, b) => claveFecha(a).localeCompare(claveFecha(b)));
  if (orden === "mayor" || orden === "menor") {
    const signo = orden === "mayor" ? -1 : 1;
    return copia.sort(
      (a, b) =>
        signo * (montoComparable(a, monedaPorCuenta, cotizaciones) - montoComparable(b, monedaPorCuenta, cotizaciones)) ||
        claveFecha(b).localeCompare(claveFecha(a))
    );
  }
  return copia.sort((a, b) => claveFecha(b).localeCompare(claveFecha(a)));
}

// Saldo estimado al final de cada día: lo que hay hoy en tus cuentas (en
// pesos con la cotización) menos lo que pasó después de ese día. Ej.: si el
// lunes a las 23:59 tenías $975, el lunes dice $975. Nunca queda negativo.
// Devuelve { "2026-10-25": 975, ... } o null si no hay cuentas cargadas.
export function saldosPorDia(movimientos, cuentas, monedaPorCuenta = {}, cotizaciones = {}) {
  if (!cuentas?.length) return null;
  let saldo = cuentas.reduce((suma, c) => suma + (aPesos(Number(c.saldo) || 0, c.moneda, cotizaciones) ?? 0), 0);
  const netoPorDia = {};
  for (const t of movimientos) {
    const fecha = (t.fecha || "").slice(0, 10);
    if (!fecha) continue;
    const enPesos = aPesos(conSigno(t), monedaPorCuenta[t.cuenta] || "ARS", cotizaciones) ?? 0;
    netoPorDia[fecha] = (netoPorDia[fecha] || 0) + enPesos;
  }
  const resultado = {};
  for (const fecha of Object.keys(netoPorDia).sort().reverse()) {
    resultado[fecha] = Math.max(0, saldo);
    saldo -= netoPorDia[fecha];
  }
  return resultado;
}

// Lista ya ordenada por fecha → [{ fecha, movimientos }] respetando ese orden.
export function agruparPorDia(lista) {
  const grupos = [];
  for (const t of lista) {
    const fecha = (t.fecha || "").slice(0, 10);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.fecha === fecha) ultimo.movimientos.push(t);
    else grupos.push({ fecha, movimientos: [t] });
  }
  return grupos;
}

// Categorías que aparecen, de la más usada a la menos.
export function categoriasPresentes(lista) {
  const cuenta = new Map();
  for (const t of lista) {
    const c = t.categoria || "Sin categoría";
    cuenta.set(c, (cuenta.get(c) || 0) + 1);
  }
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c);
}

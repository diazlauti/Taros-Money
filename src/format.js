import { iconoDeCategoria } from "./iconos";
import { infoMoneda } from "./monedas";

// $650.000 (ARS, sin centavos — así se maneja la plata en la planilla),
// US$1,234.56 (USD, con centavos, para las cuentas en dólares), €1.234,56,
// R$1.234,56 o CLP$12.500 (el peso chileno no usa centavos).
export function fmtMoney(n, moneda = "ARS") {
  const v = Number(n) || 0;
  if (moneda === "USD") {
    return "US$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const extra = infoMoneda(moneda);
  if (extra) {
    const d = extra.decimales;
    const signo = v < 0 ? "-" : "";
    return signo + extra.simbolo + Math.abs(v).toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  const signo = v < 0 ? "-" : "";
  return signo + "$" + Math.round(Math.abs(v)).toLocaleString("es-AR");
}

export function fmtFecha(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length < 3) return fecha;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
}

// Lee un monto escrito como lo escribe cualquiera acá: "1500", "1500,50",
// "1.500", "1.500,50", "$ 1.500". Devuelve NaN si no es un número.
// "2026-10-16 05:30" (hora de Argentina) → "hace 5 min", "hace 2 h", "ayer a las 21:10".
export function haceCuanto(texto, ahora = new Date()) {
  const m = String(texto || "").match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
  if (!m) return "";
  const fecha = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00-03:00`);
  const minutos = Math.round((ahora - fecha) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.round(minutos / 60)} h`;
  if (minutos < 48 * 60) return `ayer a las ${m[4]}:${m[5]}`;
  return `el ${Number(m[3])}/${Number(m[2])} a las ${m[4]}:${m[5]}`;
}

export function parseMonto(texto) {
  let t = String(texto ?? "").replace(/[\s$]/g, "");
  if (!t) return NaN;
  const tienePunto = t.includes(".");
  const tieneComa = t.includes(",");
  if (tienePunto && tieneComa) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (tieneComa) {
    t = t.replace(",", ".");
  } else if (tienePunto && /^-?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

// Moneda de cada cuenta por nombre: cada movimiento/suscripción viene con la
// cuenta de la que salió, y cada cuenta tiene su moneda (Cuscatlán es USD, el
// resto suele ser ARS). Sin esto, un gasto de US$64 se mostraba como "$64".
export function mapaMonedas(cuentas) {
  return Object.fromEntries((cuentas || []).map((c) => [c.nombre, c.moneda]));
}

// Pasa un monto a pesos con las cotizaciones ({ USD: 1565, EUR: 1717 }).
// Si es en otra moneda y no hay cotización devuelve null, para que quien lo
// use pueda avisar en vez de sumar 0 sin decir nada.
export function aPesos(monto, moneda, cotizaciones) {
  const n = Number(monto) || 0;
  if (!moneda || moneda === "ARS") return n;
  const tasa = cotizaciones?.[moneda];
  return tasa ? n * tasa : null;
}

// Ícono de una categoría: el que eligió la persona o uno según el nombre (ver iconos.js).
export function iconoPorCategoria(categoria) {
  return iconoDeCategoria(categoria);
}

const pad2 = (n) => String(n).padStart(2, "0");

// Fecha y hora de este momento, en el formato que usa la planilla.
export function fechaHoraActual(ahora = new Date()) {
  return {
    fecha: `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}-${pad2(ahora.getDate())}`,
    hora: `${pad2(ahora.getHours())}:${pad2(ahora.getMinutes())}`,
  };
}

// "2026-10": el mes de un servicio pagado se guarda así.
export function mesActual(ahora = new Date()) {
  return `${ahora.getFullYear()}-${pad2(ahora.getMonth() + 1)}`;
}

const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function nombreMes(ahora = new Date()) {
  return NOMBRES_MES[ahora.getMonth()];
}

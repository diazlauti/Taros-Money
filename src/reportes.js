// Cuentas de la pantalla Reportes: meses de la tendencia, gastos de un mes
// por categoría y datos sueltos del mes. Sin React, para poder leerlo solo.
import { aPesos } from "./format";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad2 = (n) => String(n).padStart(2, "0");
const COLORES_CATEGORIA = 8;
export const SIN_CATEGORIA = "Sin categoría";

// Mismo color por nombre que en Movimientos, así una categoría se ve igual en las dos.
export function colorDeCategoria(nombre) {
  let h = 0;
  for (const letra of nombre || "") h = (h * 31 + letra.charCodeAt(0)) >>> 0;
  return `var(--cat-${h % COLORES_CATEGORIA})`;
}

// La tendencia llega del más viejo al actual ({ mes: "Oct", ingresos, gastos }).
// Se le agrega la clave "2026-10", el nombre largo y cuánto sobró.
export function mesesDeTendencia(lista, hoy = new Date()) {
  const n = lista?.length || 0;
  return (lista || []).map((m, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    const ingresos = Number(m.ingresos) || 0;
    const gastos = Number(m.gastos) || 0;
    return {
      clave: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      corto: m.mes,
      nombre: MESES[d.getMonth()],
      anio: d.getFullYear(),
      actual: i === n - 1,
      ingresos,
      gastos,
      ahorro: ingresos - gastos,
    };
  });
}

// Cuántos días hay que pedirle al backend para tener todos los gastos desde
// el primer día del mes más viejo del gráfico.
export function diasParaMeses(meses, hoy = new Date()) {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
  const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((hoyCero - desde) / 86400000) + 1;
}

// Gastos de un mes ("2026-10"), pasados a pesos. Los de mails sin confirmar
// no cuentan (tampoco cuentan en la tendencia del backend).
export function gastosDelMes(gastos, clave, monedaPorCuenta = {}, cotizaciones = {}) {
  return (gastos || [])
    .filter((g) => !g.sinConfirmar && String(g.fecha || "").startsWith(clave))
    .map((g) => {
      const n = Math.abs(Number(g.monto) || 0);
      const enPesos = aPesos(n, monedaPorCuenta[g.cuenta] || "ARS", cotizaciones);
      return { ...g, categoria: g.categoria || SIN_CATEGORIA, enPesos: enPesos ?? 0, sinCotizacion: enPesos === null };
    });
}

// [{ categoria, total, cantidad, pct }] de mayor a menor. pct = parte del total del mes.
export function porCategoria(gastosMes) {
  const mapa = new Map();
  for (const g of gastosMes) {
    const c = mapa.get(g.categoria) || { categoria: g.categoria, total: 0, cantidad: 0 };
    c.total += g.enPesos;
    c.cantidad += 1;
    mapa.set(g.categoria, c);
  }
  const total = gastosMes.reduce((s, g) => s + g.enPesos, 0);
  return [...mapa.values()]
    .map((c) => ({ ...c, pct: total > 0 ? c.total / total : 0 }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));
}

// Variación de "actual" contra "anterior": 0.12 = 12% más. null si antes fue 0.
export function variacion(actual, anterior) {
  if (!anterior) return null;
  return (actual - anterior) / anterior;
}

// Lo gastado en un mes hasta el día N inclusive (para comparar el mes en
// curso con el anterior "a esta altura" y no contra el mes entero).
export function gastadoHastaElDia(gastosMes, dia) {
  return gastosMes.filter((g) => Number(String(g.fecha).slice(8, 10)) <= dia).reduce((s, g) => s + g.enPesos, 0);
}

function diasDelMes(clave) {
  const [a, m] = clave.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

// Promedio por día, el día que más se gastó, el gasto más grande y cuántos hubo.
export function datosDelMes(gastosMes, clave, hoy = new Date()) {
  const hoyClave = `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
  const dias = clave === hoyClave ? hoy.getDate() : diasDelMes(clave);
  const total = gastosMes.reduce((s, g) => s + g.enPesos, 0);

  const porDia = new Map();
  for (const g of gastosMes) {
    const f = String(g.fecha).slice(0, 10);
    porDia.set(f, (porDia.get(f) || 0) + g.enPesos);
  }
  let diaPico = null;
  for (const [fecha, suma] of porDia) {
    if (!diaPico || suma > diaPico.total) diaPico = { fecha, total: suma };
  }
  const masGrande = gastosMes.reduce((max, g) => (!max || g.enPesos > max.enPesos ? g : max), null);

  return {
    total,
    promedioDiario: dias > 0 ? total / dias : 0,
    diaPico,
    masGrande,
    cantidad: gastosMes.length,
    hayOtraMoneda: gastosMes.some((g) => g.sinCotizacion),
  };
}

// "2026-10-25" → "sábado 25"
export function diaCorto(fecha) {
  const m = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${nombres[d.getDay()]} ${d.getDate()}`;
}

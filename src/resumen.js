// Cuentas del Resumen: lo que entró y salió, los últimos movimientos y las
// categorías. Sin React, para poder leerlo solo.
import { aPesos } from "./format";

const OCULTAR_KEY = "taros-ocultar-saldo";

// Suma en pesos; lo que está en otra moneda sin cotización queda afuera.
export function totalEnPesos(lista, monedaPorCuenta = {}, cotizaciones = {}) {
  return (lista || []).reduce((sum, t) => {
    const moneda = t.moneda || monedaPorCuenta[t.cuenta] || "ARS";
    return sum + (aPesos(Math.abs(Number(t.monto) || 0), moneda, cotizaciones) ?? 0);
  }, 0);
}

// Los de mails sin confirmar todavía no son gastos (se ven en Movimientos).
export function soloConfirmados(lista) {
  return (lista || []).filter((t) => !t.sinConfirmar);
}

// Gastos e ingresos juntos, los más nuevos primero.
export function ultimosMovimientos(gastos, ingresos, cantidad) {
  const todos = [
    ...soloConfirmados(gastos).map((g) => ({ ...g, tipo: "gasto" })),
    ...soloConfirmados(ingresos).map((i) => ({ ...i, tipo: "ingreso" })),
  ];
  todos.sort((a, b) => {
    const ka = `${a.fecha || ""} ${a.hora || ""}`;
    const kb = `${b.fecha || ""} ${b.hora || ""}`;
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  });
  return todos.slice(0, cantidad);
}

// Categorías de mayor a menor, con su porcentaje del total.
export function categoriasOrdenadas(porCategoria, totalGeneral) {
  return Object.entries(porCategoria || {})
    .map(([nombre, d]) => ({ nombre, total: d.total, pct: totalGeneral ? (d.total / totalGeneral) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
}

// El ojito del saldo: se recuerda en este dispositivo.
export function leerOcultarSaldo() {
  try {
    return localStorage.getItem(OCULTAR_KEY) === "1";
  } catch {
    return false;
  }
}

export function guardarOcultarSaldo(ocultar) {
  try {
    localStorage.setItem(OCULTAR_KEY, ocultar ? "1" : "0");
  } catch {
    /* modo privado: vuelve a mostrarse al recargar, no pasa nada */
  }
}

// Cuánto entró o salió cada día del período (para las barritas de la
// compu). Como mucho 30 barras: en 90 días cada barra junta 3 días.
export function totalesPorDia(lista, dias, monedaPorCuenta = {}, cotizaciones = {}, hoy = new Date()) {
  const porBarra = Math.max(1, Math.ceil(dias / 30));
  const barras = Math.ceil(dias / porBarra);
  const totales = new Array(barras).fill(0);
  const pad2 = (n) => String(n).padStart(2, "0");
  const clave = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const indice = {};
  for (let i = 0; i < barras * porBarra; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    indice[clave(d)] = barras - 1 - Math.floor(i / porBarra);
  }
  soloConfirmados(lista).forEach((t) => {
    const i = indice[t.fecha];
    if (i !== undefined) totales[i] += totalEnPesos([t], monedaPorCuenta, cotizaciones);
  });
  return totales;
}

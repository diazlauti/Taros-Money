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

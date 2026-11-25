// Cuentas del Resumen: lo que entró y salió, los últimos movimientos y las
// categorías. Sin React, para poder leerlo solo.
import { aPesos, fmtFecha } from "./format";
import { diasHastaCobro } from "./bandeja";

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

// «Para pagar» del inicio: los servicios que faltan pagar este mes y el
// próximo cobro de cada suscripción, todo junto y por fecha (lo vencido
// primero). Así aparece lo que tengas: servicios, suscripciones o los dos.
// `servicios` ya viene con estado (serviciosConEstado).
export function proximosPagos(servicios = [], suscripciones = [], ahora = new Date()) {
  const lista = [
    ...(servicios || [])
      .filter((s) => s.estado !== "pagado")
      .map((s) => ({ ...s, tipo: "servicio", dias: s.diasRestantes })),
    ...(suscripciones || [])
      .map((s) => ({ ...s, tipo: "suscripcion", dias: diasHastaCobro(s.diaCobro, ahora) }))
      .filter((s) => s.dias !== null),
  ];
  return lista.sort((a, b) => a.dias - b.dias || (a.tipo === "servicio" ? -1 : 1));
}

// Lo que se paga antes de que termine el mes (para el «Falta $X»).
export function esDeEsteMes(pago, ahora = new Date()) {
  const ultimo = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate();
  return pago.dias <= ultimo - ahora.getDate();
}

// "2026-12-03" a partir de los días que faltan.
export function fechaEnDias(dias, ahora = new Date()) {
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Lo que va a la derecha de una suscripción: «Se cobra hoy», «mañana» o el día.
export function textoCobroSub(dias, ahora = new Date()) {
  if (dias === 0) return "Se cobra hoy";
  if (dias === 1) return "Se cobra mañana";
  return `Se cobra el ${fmtFecha(fechaEnDias(dias, ahora))}`;
}

// $650.000 (ARS, sin centavos — así se maneja la plata en la planilla) o
// US$1,234.56 (USD, con centavos, para las cuentas en dólares).
export function fmtMoney(n, moneda = "ARS") {
  const v = Number(n) || 0;
  if (moneda === "USD") {
    return "US$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// Pasa un monto a pesos. Si es en USD y no hay cotización devuelve null,
// para que quien lo use pueda avisar en vez de sumar 0 sin decir nada.
export function aPesos(monto, moneda, cotizacionUsdArs) {
  const n = Number(monto) || 0;
  if (moneda !== "USD") return n;
  return cotizacionUsdArs ? n * cotizacionUsdArs : null;
}

const ICONOS_CATEGORIA = {
  comida: "ph ph-hamburger",
  transporte: "ph ph-car",
  servicios: "ph ph-lightning",
  entretenimiento: "ph ph-film-slate",
  salud: "ph ph-heartbeat",
  compras: "ph ph-shopping-bag",
  "gasto personal": "ph ph-user",
  sueldo: "ph ph-arrow-circle-down",
  freelance: "ph ph-arrow-circle-down",
};

export function iconoPorCategoria(categoria) {
  return ICONOS_CATEGORIA[(categoria || "").toLowerCase()] || "ph ph-dots-three-circle";
}

// $650.000 (ARS, sin centavos — así se maneja la plata en la planilla) o
// US$1,234.56 (USD, con centavos, para las cuentas en dólares).
export function fmtMoney(n, moneda = "ARS") {
  const v = Number(n) || 0;
  if (moneda === "USD") {
    return "US$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return "$" + Math.round(v).toLocaleString("es-AR");
}

export function fmtFecha(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("-");
  if (partes.length < 3) return fecha;
  const [, mes, dia] = partes;
  return `${dia}/${mes}`;
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

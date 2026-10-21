// Estado de cada servicio en el mes actual. El backend solo guarda en qué
// mes se pagó por última vez: si no es este mes, está pendiente (o vencido
// si ya pasó el día). Así, al empezar un mes nuevo todo vuelve solo a
// pendiente sin que nadie tenga que reiniciar nada.
import { mesActual } from "./format";

// Días antes del vencimiento en que se avisa "vence pronto".
export const DIAS_AVISO = 3;

const ORDEN = { vencido: 0, pronto: 1, pendiente: 2, pagado: 3 };

export const TEXTO_ESTADO = {
  vencido: "Vencido",
  pronto: "Vence pronto",
  pendiente: "Pendiente",
  pagado: "Pagado",
};

export const ICONO_ESTADO = {
  vencido: "ph ph-warning-circle",
  pronto: "ph ph-clock",
  pendiente: "ph ph-circle",
  pagado: "ph ph-check-circle",
};

export function estadoServicio(servicio, ahora = new Date()) {
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();
  // Un servicio que vence el 31 en un mes de 30 días vence el último día.
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const dia = Math.min(servicio.diaVencimiento || ultimoDia, ultimoDia);
  const vencimiento = `${mesActual(ahora)}-${String(dia).padStart(2, "0")}`;
  const hoy = ahora.getDate();
  const diasRestantes = dia - hoy;

  let estado;
  if (servicio.mesPagado === mesActual(ahora)) estado = "pagado";
  else if (diasRestantes < 0) estado = "vencido";
  else if (diasRestantes <= DIAS_AVISO) estado = "pronto";
  else estado = "pendiente";

  return { estado, vencimiento, diasRestantes };
}

export function textoVencimiento({ estado, diasRestantes }) {
  if (estado === "pagado") return "";
  if (diasRestantes < 0) {
    const n = -diasRestantes;
    return n === 1 ? "Venció ayer" : `Venció hace ${n} días`;
  }
  if (diasRestantes === 0) return "Vence hoy";
  if (diasRestantes === 1) return "Vence mañana";
  return `Vence en ${diasRestantes} días`;
}

// Lista con el estado calculado, ordenada por urgencia y después por día.
export function serviciosConEstado(lista, ahora = new Date()) {
  return (lista || [])
    .map((s) => ({ ...s, ...estadoServicio(s, ahora) }))
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.diasRestantes - b.diasRestantes);
}

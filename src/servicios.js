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

// Lo que va en la pastilla: los días que faltan (o «Pagado»). Así no se
// repite «Vence pronto» al lado de «Vence en 2 días».
export function etiquetaEstado(servicio) {
  return servicio.estado === "pagado" ? TEXTO_ESTADO.pagado : textoVencimiento(servicio);
}

// Lista con el estado calculado, ordenada por urgencia y después por día.
export function serviciosConEstado(lista, ahora = new Date()) {
  return (lista || [])
    .map((s) => ({ ...s, ...estadoServicio(s, ahora) }))
    .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.diasRestantes - b.diasRestantes);
}

// Atajos para crear los servicios de siempre con un toque.
export const SERVICIOS_TIPICOS = [
  { nombre: "Luz", icono: "ph ph-lightbulb" },
  { nombre: "Agua", icono: "ph ph-drop" },
  { nombre: "Gas", icono: "ph ph-flame" },
  { nombre: "Internet", icono: "ph ph-wifi-high" },
  { nombre: "Teléfono", icono: "ph ph-device-mobile" },
  { nombre: "Alquiler", icono: "ph ph-house" },
  { nombre: "Expensas", icono: "ph ph-buildings" },
  { nombre: "ABL", icono: "ph ph-bank" },
  { nombre: "Seguro", icono: "ph ph-shield-check" },
];

const ICONO_POR_NOMBRE = {
  ...Object.fromEntries(SERVICIOS_TIPICOS.map((t) => [t.nombre.toLowerCase(), t.icono])),
  wifi: "ph ph-wifi-high",
  celular: "ph ph-device-mobile",
  telefono: "ph ph-device-mobile",
  cable: "ph ph-television",
  municipal: "ph ph-bank",
};

// Ícono del servicio por su nombre (Luz → lamparita); si no es uno de los
// típicos, null para usar el de la categoría.
export function iconoServicio(nombre) {
  const clave = String(nombre || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return ICONO_POR_NOMBRE[clave] || ICONO_POR_NOMBRE[String(nombre || "").trim().toLowerCase()] || null;
}

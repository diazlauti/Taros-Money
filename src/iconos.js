// Íconos de las categorías: los que elige cada uno y los de siempre.
//
// Lo elegido se guarda en el backend (obtenerIconosCategorias /
// guardarIconoCategoria) para verse igual en todos los dispositivos. Si el
// backend todavía no tiene esas funciones, queda en este dispositivo.

// Para elegir: los más útiles para gastos e ingresos de todos los días.
export const ICONOS_ELEGIBLES = [
  ["ph ph-hamburger", "Comida"],
  ["ph ph-pizza", "Pizza"],
  ["ph ph-coffee", "Café"],
  ["ph ph-shopping-cart", "Súper"],
  ["ph ph-wine", "Salidas"],
  ["ph ph-car", "Auto"],
  ["ph ph-bus", "Colectivo"],
  ["ph ph-gas-pump", "Nafta"],
  ["ph ph-taxi", "Taxi"],
  ["ph ph-airplane", "Viajes"],
  ["ph ph-house", "Casa"],
  ["ph ph-lightning", "Luz"],
  ["ph ph-drop", "Agua"],
  ["ph ph-flame", "Gas"],
  ["ph ph-wifi-high", "Internet"],
  ["ph ph-device-mobile", "Celular"],
  ["ph ph-film-slate", "Cine"],
  ["ph ph-television", "Streaming"],
  ["ph ph-game-controller", "Juegos"],
  ["ph ph-music-notes", "Música"],
  ["ph ph-barbell", "Gimnasio"],
  ["ph ph-soccer-ball", "Fútbol"],
  ["ph ph-heartbeat", "Salud"],
  ["ph ph-pill", "Farmacia"],
  ["ph ph-shopping-bag", "Compras"],
  ["ph ph-t-shirt", "Ropa"],
  ["ph ph-sparkle", "Belleza"],
  ["ph ph-gift", "Regalos"],
  ["ph ph-paw-print", "Mascotas"],
  ["ph ph-baby", "Hijos"],
  ["ph ph-graduation-cap", "Estudio"],
  ["ph ph-book-open", "Libros"],
  ["ph ph-laptop", "Tecnología"],
  ["ph ph-briefcase", "Trabajo"],
  ["ph ph-user", "Personal"],
  ["ph ph-users-three", "Amigos"],
  ["ph ph-receipt", "Impuestos"],
  ["ph ph-credit-card", "Tarjeta"],
  ["ph ph-bank", "Banco"],
  ["ph ph-piggy-bank", "Ahorro"],
  ["ph ph-chart-line-up", "Inversiones"],
  ["ph ph-arrow-circle-down", "Ingreso"],
  ["ph ph-hand-coins", "Préstamo"],
  ["ph ph-wrench", "Arreglos"],
  ["ph ph-dots-three-circle", "Otros"],
];

// Los de siempre, por nombre de categoría (en minúscula y sin acentos).
const POR_DEFECTO = {
  comida: "ph ph-hamburger",
  supermercado: "ph ph-shopping-cart",
  super: "ph ph-shopping-cart",
  almacen: "ph ph-shopping-cart",
  delivery: "ph ph-pizza",
  cafe: "ph ph-coffee",
  salidas: "ph ph-wine",
  transporte: "ph ph-car",
  nafta: "ph ph-gas-pump",
  viajes: "ph ph-airplane",
  casa: "ph ph-house",
  hogar: "ph ph-house",
  alquiler: "ph ph-house",
  servicios: "ph ph-lightning",
  entretenimiento: "ph ph-film-slate",
  suscripciones: "ph ph-television",
  salud: "ph ph-heartbeat",
  farmacia: "ph ph-pill",
  gimnasio: "ph ph-barbell",
  deporte: "ph ph-soccer-ball",
  compras: "ph ph-shopping-bag",
  ropa: "ph ph-t-shirt",
  regalos: "ph ph-gift",
  mascotas: "ph ph-paw-print",
  educacion: "ph ph-graduation-cap",
  estudio: "ph ph-graduation-cap",
  tecnologia: "ph ph-laptop",
  impuestos: "ph ph-receipt",
  ahorro: "ph ph-piggy-bank",
  inversiones: "ph ph-chart-line-up",
  "gasto personal": "ph ph-user",
  personal: "ph ph-user",
  sueldo: "ph ph-arrow-circle-down",
  freelance: "ph ph-arrow-circle-down",
  otros: "ph ph-dots-three-circle",
};

export const ICONO_GENERICO = "ph ph-dots-three-circle";

const STORAGE_KEY = "taros-iconos-categorias";

function normalizar(nombre) {
  return String(nombre || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Los elegidos, indexados por nombre normalizado. Se cargan desde App.
let elegidos = {};

export function registrarIconos(mapa) {
  elegidos = Object.fromEntries(Object.entries(mapa || {}).map(([nombre, icono]) => [normalizar(nombre), icono]));
}

export function iconoDeCategoria(categoria) {
  const clave = normalizar(categoria);
  return elegidos[clave] || POR_DEFECTO[clave] || ICONO_GENERICO;
}

export function iconoElegido(categoria) {
  return elegidos[normalizar(categoria)] || "";
}

export function leerIconosLocales() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

export function guardarIconosLocales(mapa) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa));
  } catch {
    /* sin storage: dura hasta que se cierre la app */
  }
}

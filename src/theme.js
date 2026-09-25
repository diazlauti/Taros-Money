// Utilidades de tema (claro/oscuro) y paleta de categorías.

const STORAGE_KEY = "taros-theme";
const CAT_PALETTE = ["--cat-0", "--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5", "--cat-6", "--cat-7"];

export function getTemaInicial() {
try {
return localStorage.getItem(STORAGE_KEY) || "dark";
} catch {
return "dark";
}

export function guardarTema(tema) {
try {
localStorage.setItem(STORAGE_KEY, tema);
} catch {
/* ignorar: modo privado o storage bloqueado */
}
}

// Asigna un color estable a cada categoría según su posición alfabética,
// para que no dependa de nombres fijos (la planilla puede tener las que sea).
export function colorPorCategoria(nombre, listaCategorias = []) {
const ordenadas = [...listaCategorias].sort();
const idx = ordenadas.indexOf(nombre);
const pos = idx === -1 ? 0 : idx % CAT_PALETTE.length;
return `var(${CAT_PALETTE[pos]})`;
}

export const NAV_ITEMS = [
{ id: "resumen", label: "Resumen", icon: "ph ph-squares-four" },
{ id: "movimientos", label: "Movimientos", icon: "ph ph-list-bullets" },
{ id: "cuentas", label: "Cuentas", icon: "ph ph-wallet" },
{ id: "metas", label: "Metas", icon: "ph ph-target" },
{ id: "recurrentes", label: "Recurrentes", icon: "ph ph-repeat" },
{ id: "reportes", label: "Reportes", icon: "ph ph-chart-line" },
];

// Utilidades de tema (automático/claro/oscuro) y paleta de categorías.

const STORAGE_KEY = "taros-theme";
const CAT_PALETTE = ["--cat-0", "--cat-1", "--cat-2", "--cat-3", "--cat-4", "--cat-5", "--cat-6", "--cat-7"];
const TEMAS = ["auto", "light", "dark"];

// "auto" sigue al sistema (prefers-color-scheme). Si alguien ya había
// elegido claro u oscuro con el botón de antes, se respeta esa elección.
export function getTemaInicial() {
try {
const guardado = localStorage.getItem(STORAGE_KEY);
return TEMAS.includes(guardado) ? guardado : "auto";
} catch {
return "auto";
}
}

export function guardarTema(tema) {
try {
localStorage.setItem(STORAGE_KEY, tema);
} catch {
/* ignorar: modo privado o storage bloqueado */
}
}

// El tema va en <html> (y no en un div de la app) para que también lo
// tomen el login y la pantalla de "abriendo tu sesión".
export function aplicarTema(tema) {
const raiz = document.documentElement;
if (tema === "auto") raiz.removeAttribute("data-theme");
else raiz.setAttribute("data-theme", tema);
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
{ id: "servicios", label: "Servicios y subs", icon: "ph ph-receipt" },
{ id: "reportes", label: "Reportes", icon: "ph ph-chart-line" },
{ id: "configuracion", label: "Configuración", icon: "ph ph-gear" },
];

// En el celu la barra de abajo muestra 4 secciones con texto + "Más"; el
// resto se abre desde ese menú (con 7 íconos sin texto no se entendía nada).
export const NAV_CELU = ["resumen", "movimientos", "cuentas", "metas"];

// Servicios y suscripciones comparten una sola entrada del menú: adentro se
// elige cuál ver. "recurrentes" (suscripciones) sigue existiendo como pestaña.
export function seccionDelMenu(tab) {
  return tab === "recurrentes" ? "servicios" : tab;
}

export const PERIODOS = [7, 14, 30, 90];

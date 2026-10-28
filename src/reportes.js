// Cuentas de la pantalla Reportes: meses de la tendencia, gastos de un mes
// por categoría y datos sueltos del mes. Sin React, para poder leerlo solo.
import { aPesos } from "./format";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const pad2 = (n) => String(n).padStart(2, "0");
const COLORES_CATEGORIA = 8;
export const SIN_CATEGORIA = "Sin categoría";

// Mismo color por nombre que en Movimientos, así una categoría se ve igual en las dos.
export function indiceDeCategoria(nombre) {
  let h = 0;
  for (const letra of nombre || "") h = (h * 31 + letra.charCodeAt(0)) >>> 0;
  return h % COLORES_CATEGORIA;
}

export function colorDeCategoria(nombre) {
  return `var(--cat-${indiceDeCategoria(nombre)})`;
}

// La tendencia llega del más viejo al actual ({ mes: "Oct", ingresos, gastos }).
// Se le agrega la clave "2026-10", el nombre largo y cuánto sobró.
export function mesesDeTendencia(lista, hoy = new Date()) {
  const n = lista?.length || 0;
  return (lista || []).map((m, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1);
    const ingresos = Number(m.ingresos) || 0;
    const gastos = Number(m.gastos) || 0;
    return {
      clave: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
      corto: m.mes,
      nombre: MESES[d.getMonth()],
      anio: d.getFullYear(),
      actual: i === n - 1,
      ingresos,
      gastos,
      ahorro: ingresos - gastos,
    };
  });
}

// Cuántos días hay que pedirle al backend para tener todos los gastos desde
// el primer día del mes más viejo del gráfico.
export function diasParaMeses(meses, hoy = new Date()) {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
  const hoyCero = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((hoyCero - desde) / 86400000) + 1;
}

// Gastos de un mes ("2026-10"), pasados a pesos. Los de mails sin confirmar
// no cuentan (tampoco cuentan en la tendencia del backend).
export function gastosDelMes(gastos, clave, monedaPorCuenta = {}, cotizaciones = {}) {
  return (gastos || [])
    .filter((g) => !g.sinConfirmar && String(g.fecha || "").startsWith(clave))
    .map((g) => {
      const n = Math.abs(Number(g.monto) || 0);
      const enPesos = aPesos(n, monedaPorCuenta[g.cuenta] || "ARS", cotizaciones);
      return { ...g, categoria: g.categoria || SIN_CATEGORIA, enPesos: enPesos ?? 0, sinCotizacion: enPesos === null };
    });
}

// [{ categoria, total, cantidad, pct }] de mayor a menor. pct = parte del total del mes.
export function porCategoria(gastosMes) {
  const mapa = new Map();
  for (const g of gastosMes) {
    const c = mapa.get(g.categoria) || { categoria: g.categoria, total: 0, cantidad: 0 };
    c.total += g.enPesos;
    c.cantidad += 1;
    mapa.set(g.categoria, c);
  }
  const total = gastosMes.reduce((s, g) => s + g.enPesos, 0);
  return [...mapa.values()]
    .map((c) => ({ ...c, pct: total > 0 ? c.total / total : 0 }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));
}

// Variación de "actual" contra "anterior": 0.12 = 12% más. null si antes fue 0.
export function variacion(actual, anterior) {
  if (!anterior) return null;
  return (actual - anterior) / anterior;
}

// Lo gastado en un mes hasta el día N inclusive (para comparar el mes en
// curso con el anterior "a esta altura" y no contra el mes entero).
export function gastadoHastaElDia(gastosMes, dia) {
  return gastosMes.filter((g) => Number(String(g.fecha).slice(8, 10)) <= dia).reduce((s, g) => s + g.enPesos, 0);
}

function diasDelMes(clave) {
  const [a, m] = clave.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

// Promedio por día, el día que más se gastó, el gasto más grande y cuántos hubo.
export function datosDelMes(gastosMes, clave, hoy = new Date()) {
  const hoyClave = `${hoy.getFullYear()}-${pad2(hoy.getMonth() + 1)}`;
  const dias = clave === hoyClave ? hoy.getDate() : diasDelMes(clave);
  const total = gastosMes.reduce((s, g) => s + g.enPesos, 0);

  const porDia = new Map();
  for (const g of gastosMes) {
    const f = String(g.fecha).slice(0, 10);
    porDia.set(f, (porDia.get(f) || 0) + g.enPesos);
  }
  let diaPico = null;
  for (const [fecha, suma] of porDia) {
    if (!diaPico || suma > diaPico.total) diaPico = { fecha, total: suma };
  }
  const masGrande = gastosMes.reduce((max, g) => (!max || g.enPesos > max.enPesos ? g : max), null);

  return {
    total,
    promedioDiario: dias > 0 ? total / dias : 0,
    diaPico,
    masGrande,
    cantidad: gastosMes.length,
    hayOtraMoneda: gastosMes.some((g) => g.sinCotizacion),
  };
}

// "2026-10-25" → "sábado 25"
export function diaCorto(fecha) {
  const m = String(fecha || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return `${nombres[d.getDay()]} ${d.getDate()}`;
}

// Medidas de la dona, en unidades del dibujo (viewBox de 200 × 200): el aro
// va del radio 66 al 94 (centro en 80) y las esquinas se redondean con 4.
export const DONA = { radio: 80, grosor: 28, esquina: 4, hueco: 5 };
const MAX_TRAMOS = 8;

const r2 = (n) => Math.round(n * 100) / 100;
const punto = (radio, angulo) => `${r2(100 + radio * Math.cos(angulo))} ${r2(100 + radio * Math.sin(angulo))}`;

// Tramos de la dona estilo Mercado Pago: cada uno es un arco grueso con las
// esquinas apenas redondeadas y un hueco parejo entre tramo y tramo.
// Devuelve [{ categoria, otros, indice, d, conIcono, x, y }]: d es el
// dibujo del tramo (achicado `esquina` para todos lados; el trazo de ese
// grosor con uniones redondas lo devuelve a su tamaño con las puntas
// redondeadas) y x/y el centro del tramo en % del cuadro, donde va el ícono.
// - Con más de 8 categorías, las más chicas se juntan en «Otras».
// - Cada tramo tiene un largo mínimo para que se vea aunque sea el 1%.
// - El ícono va solo si entra cómodo adentro del tramo.
export function segmentosDona(lista) {
  let items = lista.filter((c) => c.total > 0);
  const total = items.reduce((s, c) => s + c.total, 0);
  if (!total) return [];
  if (items.length > MAX_TRAMOS) {
    const resto = items.slice(MAX_TRAMOS - 1).reduce((s, c) => s + c.total, 0);
    items = [...items.slice(0, MAX_TRAMOS - 1), { categoria: "Otras", total: resto, otros: true }];
  }

  const { radio, grosor, esquina, hueco } = DONA;
  const exterior = radio + grosor / 2 - esquina;
  const interior = radio - grosor / 2 + esquina;
  const centro = (angulo) => ({
    x: r2(((100 + radio * Math.cos(angulo)) / 200) * 100),
    y: r2(((100 + radio * Math.sin(angulo)) / 200) * 100),
  });
  const ARRIBA = -Math.PI / 2;

  if (items.length === 1) {
    const c = items[0];
    // Aro completo: dos círculos (el de adentro en sentido contrario hace el agujero).
    const d =
      `M ${punto(exterior, ARRIBA)} A ${exterior} ${exterior} 0 1 1 ${punto(exterior, ARRIBA + Math.PI)} ` +
      `A ${exterior} ${exterior} 0 1 1 ${punto(exterior, ARRIBA)} Z ` +
      `M ${punto(interior, ARRIBA)} A ${interior} ${interior} 0 1 0 ${punto(interior, ARRIBA + Math.PI)} ` +
      `A ${interior} ${interior} 0 1 0 ${punto(interior, ARRIBA)} Z`;
    return [{ ...base(c), d, conIcono: !c.otros, ...centro(ARRIBA + Math.PI / 4) }];
  }

  // Ángulo de cada tramo (hueco incluido): proporcional, con un mínimo. Los
  // que quedan por debajo se fijan en el mínimo y el resto se reparte.
  const VUELTA = 2 * Math.PI;
  const minimo = (hueco + 2 * esquina + 4) / radio;
  const fijos = new Set();
  let angulos = [];
  for (let vuelta = 0; vuelta < items.length; vuelta++) {
    const libre = VUELTA - fijos.size * minimo;
    const sumaLibres = items.reduce((s, c, i) => (fijos.has(i) ? s : s + c.total), 0);
    angulos = items.map((c, i) => (fijos.has(i) ? minimo : (c.total / sumaLibres) * libre));
    const nuevos = angulos.map((a, i) => (a < minimo && !fijos.has(i) ? i : -1)).filter((i) => i >= 0);
    if (!nuevos.length) break;
    nuevos.forEach((i) => fijos.add(i));
  }

  // El ícono entra si el arco (sin el hueco) mide al menos 1.2 veces el grosor del aro.
  const minimoIcono = (hueco + grosor * 1.2) / radio;
  let desde = ARRIBA;
  return items.map((c, i) => {
    const a0 = desde + hueco / 2 / radio;
    const a1 = desde + angulos[i] - hueco / 2 / radio;
    const medio = (a0 + a1) / 2;
    // Se achica `esquina` en cada punta (en ángulo, según el radio).
    const recorte = (radio2) => Math.min(esquina / radio2, (a1 - a0) / 2 - 0.0001);
    const o0 = a0 + recorte(exterior), o1 = a1 - recorte(exterior);
    const i0 = a0 + recorte(interior), i1 = a1 - recorte(interior);
    const grande = o1 - o0 > Math.PI ? 1 : 0;
    const d =
      `M ${punto(exterior, o0)} A ${exterior} ${exterior} 0 ${grande} 1 ${punto(exterior, o1)} ` +
      `L ${punto(interior, i1)} A ${interior} ${interior} 0 ${grande} 0 ${punto(interior, i0)} Z`;
    desde += angulos[i];
    return { ...base(c), d, conIcono: !c.otros && angulos[i] >= minimoIcono, ...centro(medio) };
  });
}

function base(c) {
  return { categoria: c.categoria, otros: !!c.otros, indice: c.otros ? null : indiceDeCategoria(c.categoria) };
}

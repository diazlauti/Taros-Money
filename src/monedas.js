// Monedas que se pueden sumar además del peso, y la cotización automática.
//
// La cotización la trae la página directo de dolarapi.com (gratis, sin
// clave y con CORS abierto). Así el backend no necesita el permiso de
// "conectarse a servicios externos" y nadie tiene que volver a aceptar
// permisos de Google. Se usa el valor de "venta" (el que se ve en las
// pizarras). Lo que elige cada uno (qué monedas, automática o fija) se
// guarda en el backend con guardarMonedas.

export const MONEDAS = {
  USD: { nombre: "Dólar", plural: "Dólares", simbolo: "US$", decimales: 2, icono: "ph ph-currency-dollar" },
  EUR: { nombre: "Euro", plural: "Euros", simbolo: "€", decimales: 2, icono: "ph ph-currency-eur" },
  BRL: { nombre: "Real", plural: "Reales", simbolo: "R$", decimales: 2, icono: "ph ph-money" },
  CLP: { nombre: "Peso chileno", plural: "Pesos chilenos", simbolo: "CLP$", decimales: 0, icono: "ph ph-money" },
};

export const CODIGOS_EXTRA = Object.keys(MONEDAS);

// Monedas que agrega cada uno (ej. el peso uruguayo, o "USDT"): siempre con
// valor fijo, porque no hay de dónde traer su cotización. Viven en la misma
// config que las otras, marcadas con propia: true, y se registran acá cuando
// llegan para que los montos se muestren con su símbolo.
let propias = {};

export function registrarMonedasPropias(config) {
  propias = Object.fromEntries(
    Object.entries(config || {})
      .filter(([, c]) => c?.propia)
      .map(([codigo, c]) => [
        codigo,
        {
          nombre: c.nombre || codigo,
          plural: c.nombre || codigo,
          simbolo: c.simbolo || codigo + "$",
          decimales: Number(c.decimales) === 0 ? 0 : 2,
          icono: "ph ph-coins",
          propia: true,
        },
      ]),
  );
}

// Datos para mostrar una moneda (de las de siempre o propia), o undefined.
export function infoMoneda(codigo) {
  return MONEDAS[codigo] || propias[codigo];
}

// Código válido para una moneda propia: 3 o 4 letras, que no sea una de las que ya hay.
export function errorCodigoPropio(codigo, ocupados = []) {
  const c = String(codigo || "").trim().toUpperCase();
  if (!c) return "Escribí un código corto, por ejemplo UYU.";
  if (!/^[A-Z]{3,4}$/.test(c)) return "Usá 3 o 4 letras, sin números ni espacios. Ej: UYU, PYG, USDT.";
  if (c === "ARS" || MONEDAS[c]) return "Esa moneda ya está en la lista de arriba.";
  if (ocupados.includes(c)) return "Ya agregaste una moneda con ese código.";
  return "";
}

export const TIPOS_DOLAR = [
  ["oficial", "Oficial"],
  ["blue", "Blue"],
  ["bolsa", "MEP"],
  ["tarjeta", "Tarjeta"],
];

export function nombreTipoDolar(tipo) {
  return (TIPOS_DOLAR.find(([v]) => v === tipo) || TIPOS_DOLAR[0])[1];
}

// "Pesos (ARS)", "Euros (EUR)"…
export function etiquetaMoneda(codigo) {
  if (!codigo || codigo === "ARS") return "Pesos (ARS)";
  const m = infoMoneda(codigo);
  return m ? `${m.plural} (${codigo})` : codigo;
}

const BASE = "https://dolarapi.com/v1";
const TIEMPO_LIMITE_MS = 10000;
const ESPERAS_REINTENTO_MS = [800, 2000];

async function pedirJson(url) {
  for (let intento = 0; ; intento++) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);
    try {
      const res = await fetch(url, { signal: control.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (intento >= ESPERAS_REINTENTO_MS.length) throw err;
      await new Promise((r) => setTimeout(r, ESPERAS_REINTENTO_MS[intento]));
    } finally {
      clearTimeout(temporizador);
    }
  }
}

function dato(item) {
  const valor = Number(item?.venta);
  return valor > 0 ? { valor, fecha: item.fechaActualizacion || "" } : null;
}

// Devuelve { USD: { oficial: {valor, fecha}, blue: …, bolsa: …, tarjeta: … },
//            EUR: {valor, fecha}, BRL: …, CLP: … }
export async function traerCotizaciones() {
  let dolares, otras;
  try {
    [dolares, otras] = await Promise.all([pedirJson(`${BASE}/dolares`), pedirJson(`${BASE}/cotizaciones`)]);
  } catch {
    throw new Error("No se pudo traer la cotización de hoy. Revisá tu internet y probá de nuevo.");
  }
  const resultado = { USD: {} };
  (Array.isArray(dolares) ? dolares : []).forEach((d) => {
    const v = dato(d);
    if (v && d.casa) resultado.USD[d.casa] = v;
  });
  (Array.isArray(otras) ? otras : []).forEach((c) => {
    const v = dato(c);
    if (v && c.moneda && c.moneda !== "USD" && MONEDAS[c.moneda]) resultado[c.moneda] = v;
  });
  return resultado;
}

// El valor automático de hoy para una moneda configurada, o null.
export function valorAutomatico(codigo, config, auto) {
  if (!auto) return null;
  if (codigo === "USD") return auto.USD?.[config?.tipo || "oficial"] || null;
  return auto[codigo] || null;
}

// { USD: 1565, EUR: 1717, … }: con qué se pasa cada moneda a pesos. Si la
// automática no llegó, se usa la última que quedó guardada.
export function resolverCotizaciones(monedas, auto) {
  const resultado = {};
  Object.entries(monedas || {}).forEach(([codigo, config]) => {
    const hoy = config?.modo === "auto" ? valorAutomatico(codigo, config, auto) : null;
    const valor = hoy?.valor || Number(config?.valor) || 0;
    if (valor > 0) resultado[codigo] = valor;
  });
  return resultado;
}

// Lo que hay que mandarle al backend para que sus resúmenes usen el mismo
// número que la pantalla. Vacío si ya está todo al día.
export function cotizacionesParaGuardar(monedas, auto) {
  const cambios = {};
  Object.entries(monedas || {}).forEach(([codigo, config]) => {
    if (config?.modo !== "auto") return;
    const hoy = valorAutomatico(codigo, config, auto);
    if (hoy && Math.abs(hoy.valor - Number(config.valor || 0)) > 1e-6) cambios[codigo] = hoy;
  });
  return cambios;
}

// "$1.565" o "$1,5492" (el peso chileno vale menos de 2 pesos: con
// redondear a entero se perdería todo).
export function fmtCotizacion(valor) {
  const v = Number(valor) || 0;
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: v < 10 ? 4 : 2 });
}

export function fmtActualizada(fecha) {
  const d = fecha ? new Date(fecha) : null;
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

// Calculadora de impuestos para compras en otra moneda (o con impuestos
// encima, como el IVA de los servicios digitales). Cada impuesto es un
// porcentaje sobre el precio pasado a pesos, que es como se cobran acá.
//
// Los porcentajes cambian seguido, así que todos se pueden editar y lo que
// elige cada uno queda guardado en este dispositivo.

export const IMPUESTOS_INICIALES = [
  {
    id: "ganancias",
    nombre: "Percepción de Ganancias",
    porcentaje: 30,
    activo: true,
    ayuda: "La que se cobra con tarjeta en compras en el exterior o en dólares.",
  },
  {
    id: "iva",
    nombre: "IVA servicios digitales",
    porcentaje: 21,
    activo: false,
    ayuda: "Netflix, Spotify, apps, juegos: si el precio no lo incluye.",
  },
  {
    id: "iibb",
    nombre: "Ingresos Brutos",
    porcentaje: 2,
    activo: false,
    ayuda: "Cambia según la provincia: fijate en tu resumen de tarjeta.",
  },
];

const STORAGE_KEY = "taros-calculadora";
export const MAX_IMPUESTOS = 8;

export function leerAjustesCalculadora() {
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (guardado && Array.isArray(guardado.impuestos)) {
      // El nombre viejo de Ingresos Brutos era más largo; se acorta si no lo cambiaron.
      const impuestos = guardado.impuestos.map((i) =>
        i.id === "iibb" && i.nombre === "Ingresos Brutos de tu provincia" ? { ...i, nombre: "Ingresos Brutos" } : i,
      );
      return { ...guardado, impuestos };
    }
  } catch {
    /* sin storage o dato roto: arranca con los de siempre */
  }
  return { impuestos: IMPUESTOS_INICIALES, moneda: "USD" };
}

export function guardarAjustesCalculadora(ajustes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ajustes));
  } catch {
    /* sin storage: dura hasta cerrar */
  }
}

// { base, detalle: [{ id, nombre, porcentaje, monto }], total } en pesos.
export function calcularImpuestos(monto, cotizacion, impuestos) {
  const base = (Number(monto) || 0) * (Number(cotizacion) || 0);
  const detalle = (impuestos || [])
    .filter((i) => i.activo && Number(i.porcentaje) > 0)
    .map((i) => ({ id: i.id, nombre: i.nombre, porcentaje: Number(i.porcentaje), monto: (base * Number(i.porcentaje)) / 100 }));
  const total = base + detalle.reduce((s, d) => s + d.monto, 0);
  return { base, detalle, total };
}

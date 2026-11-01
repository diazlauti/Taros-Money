// Movimientos fijos: el sueldo, el alquiler, la cuota del gimnasio… Se
// definen una vez y la app los carga sola el día que corresponde, una vez por
// mes. Cada carga lleva un ID propio (fijo-<id>-<aaaa-mm>), así que aunque se
// abra la app en dos dispositivos a la vez, el backend no la repite.
//
// La lista se guarda en el backend (obtenerFijos / guardarFijos). Si todavía no
// tiene esas funciones, queda en este dispositivo.

const CLAVE_LOCAL = "taros-fijos";
const CLAVE_HECHOS = "taros-fijos-hechos";
export const MAXIMO_FIJOS = 30;

export function leerFijosLocales() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_LOCAL) || "[]");
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

export function guardarFijosLocales(lista) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento: se pierde al cerrar */
  }
}

function leerHechos() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_HECHOS) || "[]");
    return new Set(Array.isArray(datos) ? datos : []);
  } catch {
    return new Set();
  }
}

export function recordarHecho(id) {
  const hechos = leerHechos();
  hechos.add(id);
  try {
    // Los de meses viejos ya no importan: se guardan solo los últimos.
    localStorage.setItem(CLAVE_HECHOS, JSON.stringify([...hechos].slice(-120)));
  } catch {
    /* sin almacenamiento */
  }
}

const pad = (n) => String(n).padStart(2, "0");

export function mesDe(fecha) {
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}`;
}

export function idDeFijo() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Si el día de este mes ya pasó, el fijo empieza el mes que viene: no se
// cargan de golpe cosas con fecha vieja.
export function mesDeInicio(dia, hoy = new Date()) {
  if (Number(dia) >= hoy.getDate()) return mesDe(hoy);
  return mesDe(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
}

// El 31 en un mes de 30 días (o el 30 en febrero) cae el último día del mes.
function diaEnMes(dia, anio, mes0) {
  const ultimo = new Date(anio, mes0 + 1, 0).getDate();
  return Math.min(Number(dia), ultimo);
}

// Lo que toca cargar hoy: fijos activos cuyo día de este mes ya llegó, que
// empezaron y que todavía no se cargaron.
export function fijosPendientes(fijos, hoy = new Date(), hechos = leerHechos()) {
  const mes = mesDe(hoy);
  const salida = [];
  for (const f of fijos || []) {
    if (!f || f.activo === false || !f.id) continue;
    if (f.desde && f.desde > mes) continue;
    const dia = diaEnMes(f.dia, hoy.getFullYear(), hoy.getMonth());
    if (hoy.getDate() < dia) continue;
    const id = `fijo-${f.id}-${mes}`;
    if (hechos.has(id)) continue;
    salida.push({ fijo: f, id, fecha: `${mes}-${pad(dia)}` });
  }
  return salida;
}

export function validarFijo({ nombre, monto, dia }, errorMonto) {
  const n = Number(dia);
  return {
    nombre: String(nombre || "").trim() ? "" : "Escribí un nombre, por ejemplo Sueldo o Alquiler.",
    monto: errorMonto(monto),
    dia: !String(dia ?? "").trim()
      ? "Escribí el día del mes en que se carga."
      : Number.isInteger(n) && n >= 1 && n <= 31
        ? ""
        : "Tiene que ser un número del 1 al 31.",
  };
}

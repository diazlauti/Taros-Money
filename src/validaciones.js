import { parseMonto } from "./format";

// Reglas de los formularios. Cada una devuelve { campo: "mensaje" } con ""
// cuando está bien; los mensajes dicen qué hacer, no solo qué falló.

export function errorMonto(texto, { permitirVacio = false } = {}) {
  if (!String(texto ?? "").trim()) return permitirVacio ? "" : "Escribí el monto.";
  return parseMonto(texto) > 0 ? "" : "Escribí solo números mayores a 0, por ejemplo 1500 o 1500,50.";
}

export function validarMovimiento({ monto, fecha, hora }, conHora) {
  return {
    monto: errorMonto(monto),
    fecha: fecha ? "" : "Elegí la fecha.",
    hora: conHora && !hora ? "Elegí la hora." : "",
  };
}

export function errorDiaCobro(texto) {
  if (!String(texto ?? "").trim()) return "Escribí el día del mes en que te cobran.";
  const n = Number(texto);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? "" : "Tiene que ser un número del 1 al 31.";
}

export function validarSuscripcion({ nombre, diaCobro, monto }) {
  return {
    nombre: nombre.trim() ? "" : "Escribí un nombre, por ejemplo Netflix.",
    diaCobro: errorDiaCobro(diaCobro),
    monto: errorMonto(monto),
  };
}

export function errorNombreNuevo(nombre, existentes, cosa) {
  const limpio = nombre.trim();
  if (!limpio) return `Escribí un nombre para la ${cosa}.`;
  const repetido = (existentes || []).some((e) => e.toLowerCase() === limpio.toLowerCase());
  return repetido ? `Ya tenés una ${cosa} con ese nombre. Elegí otro.` : "";
}

export function errorEmail(texto) {
  const valor = String(texto ?? "").trim();
  if (!valor) return "Escribí tu mail de Google.";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? "" : "Revisá el mail, por ejemplo nombre@gmail.com.";
}

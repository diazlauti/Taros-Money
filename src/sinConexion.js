// Usar la app sin internet.
//
// 1. Copias: la última respuesta buena de cada sección queda guardada en el
//    dispositivo. Al abrir se muestra al instante (con o sin internet) y
//    después se actualiza sola si hay conexión.
// 2. Fila de espera: los movimientos que se cargan, editan o borran sin
//    conexión quedan acá y se suben solos cuando vuelve. Cada movimiento
//    nuevo lleva su ID, así que mandarlo dos veces no lo duplica.
//
// Todo vive en localStorage y se borra al cerrar sesión.
import { useEffect, useState, useSyncExternalStore } from "react";
import * as api from "./api";

export const MENSAJE_SIN_RED = "No hay conexión. Probá de nuevo cuando vuelva internet.";

// Error de red: no llegó a Google. Las lecturas muestran la copia y los
// movimientos van a la fila de espera.
export function errorSinRed(mensaje = MENSAJE_SIN_RED) {
  const err = new Error(mensaje);
  err.transitorio = true;
  err.sinRed = true;
  return err;
}

// --- ¿Hay conexión? ---
// navigator.onLine dice "sin red" con seguridad, pero puede decir "con red"
// en un wifi sin internet: por eso también cuenta si el último pedido falló.

let ultimoPedidoFallo = false;
const oyentesConexion = new Set();

function avisarConexion() {
  oyentesConexion.forEach((f) => f());
}

export function hayConexion() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

// La llama api.js después de cada pedido.
export function registrarPedido(llego) {
  if (ultimoPedidoFallo === !llego) return;
  ultimoPedidoFallo = !llego;
  avisarConexion();
}

function suscribirConexion(f) {
  oyentesConexion.add(f);
  window.addEventListener("online", f);
  window.addEventListener("offline", f);
  return () => {
    oyentesConexion.delete(f);
    window.removeEventListener("online", f);
    window.removeEventListener("offline", f);
  };
}

export function useConexion() {
  return useSyncExternalStore(suscribirConexion, () => hayConexion() && !ultimoPedidoFallo);
}

// Al volver la conexión (el sistema avisa) se olvida la falla anterior.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    ultimoPedidoFallo = false;
    avisarConexion();
  });
}

// --- Copias de cada sección ---

const PREFIJO_COPIA = "taros-copia:";
const DUENO_KEY = "taros-copia-dueno";

export function leerCopia(clave) {
  try {
    const crudo = localStorage.getItem(PREFIJO_COPIA + clave);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

export function guardarCopia(clave, data) {
  try {
    localStorage.setItem(PREFIJO_COPIA + clave, JSON.stringify({ data, cuando: Date.now() }));
  } catch {
    /* sin lugar o storage bloqueado: sin conexión se verá menos */
  }
}

function clavesGuardadas() {
  const claves = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIJO_COPIA)) claves.push(k);
    }
  } catch {
    /* ignorar */
  }
  return claves;
}

export function hayCopias() {
  return clavesGuardadas().length > 0;
}

// Al cerrar sesión, o si entra otra cuenta en este dispositivo.
export function borrarDatosGuardados() {
  try {
    clavesGuardadas().forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(DUENO_KEY);
    localStorage.removeItem(COLA_KEY);
  } catch {
    /* ignorar */
  }
  avisarCola();
}

// Las copias son de una sola cuenta: si entra otra, se borran antes de
// mostrar nada.
export function asegurarDueno(email) {
  if (!email) return;
  try {
    const dueno = localStorage.getItem(DUENO_KEY);
    if (dueno && dueno !== email) borrarDatosGuardados();
    localStorage.setItem(DUENO_KEY, email);
  } catch {
    /* ignorar */
  }
}

// --- Fila de espera de movimientos ---
// Cada pendiente: { idOp, accion: "agregar" | "editar" | "borrar", tipo:
// "gasto" | "ingreso", clave, datos (agregar), criterio + cambios (editar),
// criterio (borrar), anterior: { monto, cuenta } (editar y borrar, para el
// saldo en pantalla), error?, subidoEn? }.

const COLA_KEY = "taros-cola";
let colaEnMemoria = null;
const oyentesCola = new Set();

function avisarCola() {
  colaEnMemoria = null;
  oyentesCola.forEach((f) => f());
}

export function leerCola() {
  if (colaEnMemoria) return colaEnMemoria;
  try {
    const crudo = localStorage.getItem(COLA_KEY);
    colaEnMemoria = crudo ? JSON.parse(crudo) : [];
  } catch {
    colaEnMemoria = [];
  }
  return colaEnMemoria;
}

function guardarCola(ops) {
  try {
    if (ops.length) localStorage.setItem(COLA_KEY, JSON.stringify(ops));
    else localStorage.removeItem(COLA_KEY);
  } catch {
    /* sin storage: no se puede guardar sin conexión */
    throw new Error("No se pudo guardar en este dispositivo. Probá de nuevo con internet.");
  }
  avisarCola();
}

function suscribirCola(f) {
  oyentesCola.add(f);
  // Otra pestaña abierta de la app también la cambia.
  const deOtraPestana = (e) => e.key === COLA_KEY && avisarCola();
  window.addEventListener("storage", deOtraPestana);
  return () => {
    oyentesCola.delete(f);
    window.removeEventListener("storage", deOtraPestana);
  };
}

export function useCola() {
  return useSyncExternalStore(suscribirCola, leerCola);
}

// Lo que falta subir (sin contar lo ya subido que espera la recarga).
export function pendientesDeSubir(ops) {
  return ops.filter((op) => !op.subidoEn);
}

// Identifica un movimiento aunque cambie: por su ID, o (filas viejas sin ID)
// por cómo estaba al traerlo.
export function claveMovimiento(tipo, m) {
  if (m.claveCola) return m.claveCola;
  if (m.id) return String(m.id);
  return `${tipo}|${m.fecha || ""}|${m.hora || ""}|${Number(m.monto) || 0}|${m.descripcion || ""}`;
}

function nuevoIdOp() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function encolar(op) {
  guardarCola([...leerCola(), { idOp: nuevoIdOp(), creado: Date.now(), ...op }]);
}

function opsDe(clave) {
  return leerCola().filter((op) => op.clave === clave && !op.subidoEn);
}

export function hayPendientesDe(tipo, m) {
  return opsDe(claveMovimiento(tipo, m)).length > 0;
}

// Saca todo lo que no se subió de ese movimiento (el botón «Descartar» de
// uno que no se pudo subir).
export function descartarPendientes(tipo, m) {
  const clave = claveMovimiento(tipo, m);
  guardarCola(leerCola().filter((op) => op.clave !== clave || op.subidoEn));
}

// --- Cómo se ven los pendientes en pantalla ---

// La lista de gastos (o ingresos) con lo de la fila aplicado: los nuevos
// aparecen, los editados cambian y los borrados se van. «pedidoEn» es cuándo
// se pidió la lista: lo que ya se subió antes de eso ya viene incluido.
export function aplicarCola(lista, ops, tipo, pedidoEn = 0) {
  if (!Array.isArray(lista)) return lista;
  const propias = ops.filter((op) => op.tipo === tipo && !(op.subidoEn && op.subidoEn < pedidoEn));
  if (!propias.length) return lista;
  let resultado = [...lista];
  for (const op of propias) {
    const marca = { pendiente: !op.subidoEn, claveCola: op.clave, errorCola: op.error || "" };
    if (op.accion === "agregar") {
      if (resultado.some((m) => m.id && m.id === op.datos.id)) continue;
      resultado = [{ ...op.datos, ...marca }, ...resultado];
    } else {
      const i = resultado.findIndex((m) => claveMovimiento(tipo, m) === op.clave);
      if (i === -1) continue;
      if (op.accion === "borrar") resultado.splice(i, 1);
      else resultado[i] = { ...resultado[i], ...op.cambios, ...marca };
    }
  }
  return resultado;
}

// Saldos de las cuentas con lo pendiente ya sumado o restado, así el total
// y el «Saldo del día» cuadran con la lista. La tarjeta no se toca (el
// backend tampoco la mueve).
export function aplicarColaACuentas(cuentas, ops, pedidoEn = 0) {
  if (!Array.isArray(cuentas)) return cuentas;
  const propias = ops.filter((op) => !(op.subidoEn && op.subidoEn < pedidoEn));
  if (!propias.length) return cuentas;
  const deltas = {};
  const mover = (cuenta, monto, tipo, signo) => {
    if (!cuenta) return;
    const n = Math.abs(Number(monto) || 0) * (tipo === "ingreso" ? 1 : -1) * signo;
    const k = String(cuenta).toLowerCase();
    deltas[k] = (deltas[k] || 0) + n;
  };
  for (const op of propias) {
    if (op.accion === "agregar") mover(op.datos.cuenta, op.datos.monto, op.tipo, 1);
    else if (op.anterior) {
      mover(op.anterior.cuenta, op.anterior.monto, op.tipo, -1);
      if (op.accion === "editar") {
        mover(op.cambios.cuenta ?? op.anterior.cuenta, op.cambios.monto ?? op.anterior.monto, op.tipo, 1);
      }
    }
  }
  return cuentas.map((c) => {
    const d = deltas[String(c.nombre).toLowerCase()];
    return d && !c.esTarjeta ? { ...c, saldo: (Number(c.saldo) || 0) + d } : c;
  });
}

// --- Guardar movimientos (con o sin conexión) ---
// Devuelven { enCola: true } si quedó esperando la conexión.

function funcionesDe(a, tipo) {
  return tipo === "gasto"
    ? { agregar: a.agregarGasto, editar: a.editarGasto, borrar: a.borrarGasto }
    : { agregar: a.agregarIngreso, editar: a.editarIngreso, borrar: a.borrarIngreso };
}

// Sin conexión, o si no llegó a Google: a la fila. Cualquier otro error (un
// dato inválido) se muestra como siempre.
async function intentarOEncolar(op, enviar) {
  if (!hayConexion()) {
    encolar(op);
    return { enCola: true };
  }
  try {
    await enviar();
    return {};
  } catch (err) {
    if (!err.transitorio) throw err;
    encolar(op);
    return { enCola: true };
  }
}

export async function agregarMovimiento(tipo, datos) {
  const a = api;
  const conId = { ...datos, id: datos.id || a.nuevoIdMovimiento() };
  return intentarOEncolar({ accion: "agregar", tipo, clave: conId.id, datos: conId }, () =>
    funcionesDe(a, tipo).agregar(conId),
  );
}

export async function editarMovimiento(tipo, movimiento, criterio, cambios) {
  const a = api;
  const clave = claveMovimiento(tipo, movimiento);
  const ops = leerCola();
  // Todavía no se subió: se cambia lo que está esperando.
  const alta = ops.find((op) => op.clave === clave && op.accion === "agregar" && !op.subidoEn);
  if (alta) {
    guardarCola(ops.map((op) => (op === alta ? { ...op, datos: { ...op.datos, ...cambios }, error: undefined } : op)));
    return { enCola: true };
  }
  // Un cambio anterior no se pudo subir (ej. eligió una cuenta borrada): se
  // corrige ese mismo, que tiene cómo está de verdad en la planilla.
  const trabado = ops.find((op) => op.clave === clave && op.accion === "editar" && op.error && !op.subidoEn);
  if (trabado) {
    guardarCola(ops.map((op) => (op === trabado ? { ...op, cambios: { ...op.cambios, ...cambios }, error: undefined } : op)));
    return { enCola: true };
  }
  const op = { accion: "editar", tipo, clave, criterio, cambios, anterior: { monto: movimiento.monto, cuenta: movimiento.cuenta } };
  // Si ya tiene cambios esperando, este va después (si no, se pisarían).
  if (opsDe(clave).length) {
    encolar(op);
    return { enCola: true };
  }
  return intentarOEncolar(op, () => funcionesDe(a, tipo).editar(criterio, cambios));
}

export async function borrarMovimiento(tipo, movimiento, criterio) {
  const a = api;
  const clave = claveMovimiento(tipo, movimiento);
  const ops = leerCola();
  // Nunca se subió: alcanza con sacarlo de la fila.
  if (ops.some((op) => op.clave === clave && op.accion === "agregar" && !op.subidoEn)) {
    guardarCola(ops.filter((op) => op.clave !== clave || op.subidoEn));
    return {};
  }
  const trabado = ops.find((op) => op.clave === clave && op.accion === "editar" && op.error && !op.subidoEn);
  if (trabado) {
    const resto = ops.filter((op) => op.clave !== clave || op.subidoEn);
    guardarCola([...resto, { idOp: nuevoIdOp(), creado: Date.now(), accion: "borrar", tipo, clave, criterio: trabado.criterio, anterior: trabado.anterior }]);
    return { enCola: true };
  }
  const op = { accion: "borrar", tipo, clave, criterio, anterior: { monto: movimiento.monto, cuenta: movimiento.cuenta } };
  if (opsDe(clave).length) {
    encolar(op);
    return { enCola: true };
  }
  return intentarOEncolar(op, () => funcionesDe(a, tipo).borrar(criterio));
}

// --- Subir la fila ---

let subiendo = null;
const oyentesSubiendo = new Set();

function cambiarSubiendo(valor) {
  subiendo = valor;
  oyentesSubiendo.forEach((f) => f());
}

export function useSubiendo() {
  const [, forzar] = useState(0);
  useEffect(() => {
    const f = () => forzar((n) => n + 1);
    oyentesSubiendo.add(f);
    return () => oyentesSubiendo.delete(f);
  }, []);
  return !!subiendo;
}

function marcar(idOp, cambios) {
  guardarCola(leerCola().map((op) => (op.idOp === idOp ? { ...op, ...cambios } : op)));
}

// Sube en orden lo que está esperando. Si se corta la red, frena y sigue la
// próxima vez. Si Google rechaza uno (ej. la cuenta ya no existe), queda
// marcado con el motivo y no frena al resto. Devuelve { subidos, fallidos }.
export function subirCola() {
  if (subiendo) return subiendo;
  const pendientes = pendientesDeSubir(leerCola()).filter((op) => !op.error);
  if (!pendientes.length || !hayConexion()) return Promise.resolve({ subidos: 0, fallidos: [] });
  const tarea = (async () => {
    const a = api;
    let subidos = 0;
    const fallidos = [];
    const trabados = new Set(pendientesDeSubir(leerCola()).filter((op) => op.error).map((op) => op.clave));
    for (const { idOp } of pendientes) {
      const op = leerCola().find((o) => o.idOp === idOp);
      // Se borró o cambió mientras se subía lo anterior.
      if (!op || op.subidoEn || op.error) continue;
      // Un cambio anterior del mismo movimiento no se pudo subir: este espera.
      if (trabados.has(op.clave)) continue;
      const f = funcionesDe(a, op.tipo);
      try {
        if (op.accion === "agregar") await f.agregar(op.datos);
        else if (op.accion === "editar") await f.editar(op.criterio, op.cambios);
        else await f.borrar(op.criterio);
        marcar(idOp, { subidoEn: Date.now() });
        subidos++;
      } catch (err) {
        if (err.transitorio || err.requiereLogin) break;
        // Borrar algo que ya no está es lo mismo que haberlo borrado.
        if (op.accion === "borrar" && /no encontr/i.test(err.message || "")) {
          marcar(idOp, { subidoEn: Date.now() });
          subidos++;
          continue;
        }
        marcar(idOp, { error: err.message || "No se pudo subir." });
        trabados.add(op.clave);
        fallidos.push({ ...op, error: err.message });
      }
    }
    return { subidos, fallidos };
  })();
  cambiarSubiendo(tarea);
  tarea.finally(() => cambiarSubiendo(null));
  return tarea;
}

// Lo ya subido se borra de la fila cuando llegaron las listas nuevas (que ya
// lo traen), así no se ve ni dos veces ni ningún parpadeo.
export function limpiarSubidos(pedidoEn) {
  const ops = leerCola();
  const quedan = ops.filter((op) => !op.subidoEn || op.subidoEn >= pedidoEn);
  if (quedan.length !== ops.length) guardarCola(quedan);
}

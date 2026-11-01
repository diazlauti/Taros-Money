// Carga rápida: gastos/ingresos frecuentes y links que abren el formulario
// ya completo (los usan los atajos del ícono de la app, ver vite.config.js).

// Agrupa por descripción + categoría lo que ya cargaste y devuelve lo que se
// repite (2 veces o más), con el monto y la cuenta de la última vez.
export function movimientosFrecuentes(movimientos, max = 4) {
  const grupos = new Map();
  for (const m of movimientos || []) {
    const descripcion = String(m.descripcion || "").trim();
    // Los de mails sin confirmar todavía no son gastos tuyos.
    if (!descripcion || m.sinConfirmar) continue;
    const clave = `${descripcion.toLowerCase()}|${m.categoria || ""}`;
    const fecha = `${m.fecha || ""} ${m.hora || ""}`;
    const g = grupos.get(clave);
    if (!g) {
      grupos.set(clave, { descripcion, categoria: m.categoria || "", monto: m.monto, cuenta: m.cuenta || "", fecha, veces: 1 });
      continue;
    }
    g.veces++;
    if (fecha > g.fecha) Object.assign(g, { monto: m.monto, cuenta: m.cuenta || g.cuenta, fecha });
  }
  return [...grupos.values()]
    .filter((g) => g.veces >= 2)
    .sort((a, b) => b.veces - a.veces || b.fecha.localeCompare(a.fecha))
    .slice(0, max);
}

// Armar un movimiento a partir de un texto compartido (un comprobante, el
// aviso de una transferencia…). Busca el monto (el que viene con «$» o, si no
// hay, el más grande) y deja el resto como descripción. Devuelve null si no
// encuentra ningún monto.
export function desdeTextoCompartido(texto) {
  const limpio = String(texto || "").replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim();
  const montos = [];
  const patron = /(\$|ARS|AR\$)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/gi;
  for (const m of limpio.matchAll(patron)) {
    const valor = Number(m[2].replace(/\./g, "").replace(",", "."));
    if (valor > 0) montos.push({ crudo: m[0], texto: m[2].replace(/\./g, ""), valor, conSigno: !!m[1] });
  }
  if (montos.length === 0) return null;
  const elegido = montos.find((m) => m.conSigno) || montos.reduce((a, b) => (b.valor > a.valor ? b : a));
  const descripcion = limpio.replace(elegido.crudo, " ").replace(/\s+/g, " ").replace(/^[\s:.,-]+|[\s:.,-]+$/g, "").slice(0, 60);
  const esIngreso = /recibiste|te transfirieron|te enviaron|acreditaron|cobraste/i.test(limpio);
  return { tipo: esIngreso ? "ingreso" : "gasto", monto: elegido.texto, descripcion, categoria: "" };
}

// Lee ?nuevo=gasto&monto=1500&desc=Café&cat=Comida (los atajos del ícono) o
// lo que llega al tocar «Compartir» en el celu y elegir Taros Money
// (?text=…, ver share_target en vite.config.js). Devuelve null si el link no
// pide abrir un movimiento nuevo.
export function leerNuevoDeUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const tipo = p.get("nuevo");
    if (tipo === "gasto" || tipo === "ingreso") {
      return { tipo, monto: p.get("monto") || "", descripcion: p.get("desc") || "", categoria: p.get("cat") || "" };
    }
    const compartido = [p.get("title"), p.get("text")].filter(Boolean).join(" ");
    if (compartido) return desdeTextoCompartido(compartido) || { tipo: "gasto", monto: "", descripcion: compartido.slice(0, 60), categoria: "" };
    return null;
  } catch {
    return null;
  }
}

// Saca los parámetros de la barra de direcciones para que recargar la página
// no vuelva a abrir el formulario.
export function limpiarNuevoDeUrl() {
  try {
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    /* sin history (no debería pasar en un navegador) */
  }
}

// Al tocar un aviso del celu, la app se abre con ?ver=revisar (Movimientos
// filtrado en lo que hay que revisar) o ?ver=servicios.
export function leerVerDeUrl() {
  try {
    const ver = new URLSearchParams(window.location.search).get("ver");
    return ver === "revisar" || ver === "servicios" ? ver : null;
  } catch {
    return null;
  }
}

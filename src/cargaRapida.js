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

// Lee ?nuevo=gasto&monto=1500&desc=Café&cat=Comida. Devuelve null si el link
// no pide abrir un movimiento nuevo.
export function leerNuevoDeUrl() {
  try {
    const p = new URLSearchParams(window.location.search);
    const tipo = p.get("nuevo");
    if (tipo !== "gasto" && tipo !== "ingreso") return null;
    return { tipo, monto: p.get("monto") || "", descripcion: p.get("desc") || "", categoria: p.get("cat") || "" };
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

import { useState } from "react";
import { borrarSuscripcion, editarSuscripcion } from "../api";
import { playClick, playError, playSuccess } from "../sounds";

export default function EditarSuscripcionDialog({ suscripcion, categorias, cuentas, onClose, onGuardado }) {
  const [nombre, setNombre] = useState(suscripcion.nombre || "");
  const [diaCobro, setDiaCobro] = useState(String(suscripcion.diaCobro || ""));
  const [categoria, setCategoria] = useState(suscripcion.categoria || "");
  const [monto, setMonto] = useState(String(suscripcion.monto));
  const [cuenta, setCuenta] = useState(suscripcion.cuenta || "");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  // Identifica la fila original por nombre (tal como estaba cuando se cargó
  // la lista): es el único dato que la planilla usa para encontrarla.
  const nombreOriginal = suscripcion.nombre;

  async function guardar(e) {
    e.preventDefault();
    const diaCobroNum = parseInt(diaCobro, 10);
    if (!nombre.trim()) {
      setError("Completá el nombre.");
      return;
    }
    if (!diaCobroNum || diaCobroNum < 1 || diaCobroNum > 31) {
      setError("El día de cobro tiene que ser entre 1 y 31.");
      return;
    }
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await editarSuscripcion(nombreOriginal, { nombre: nombre.trim(), diaCobro: diaCobroNum, categoria, monto: montoNum, cuenta });
      playSuccess();
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el cambio.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar la suscripción "${suscripcion.nombre}"?`)) return;
    setBorrando(true);
    setError("");
    try {
      await borrarSuscripcion(nombreOriginal);
      playClick();
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Editar suscripción</div>
        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Nombre</label>
            <input className="input" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>

          <div className="fila-2">
            <div className="field">
              <label>Día de cobro</label>
              <input
                className="input"
                type="number"
                min="1"
                max="31"
                value={diaCobro}
                onChange={(e) => setDiaCobro(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Monto mensual</label>
              <input
                className="input"
                type="number"
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Categoría</label>
            <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">(sin categoría)</option>
              {(categorias || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {cuentas && cuentas.length > 0 && (
            <div className="field">
              <label>Cuenta de la que se debita</label>
              <select className="input" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                {cuentas.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="dialog-actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={borrar}
              disabled={borrando || enviando}
              style={{ color: "var(--error)" }}
            >
              {borrando ? "Borrando…" : "Borrar"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={enviando || borrando}>
                {enviando ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>

          {error && <p className="mensaje-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

import { useState } from "react";
import { borrarIngreso, editarIngreso } from "../api";
import { playClick, playError, playSuccess } from "../sounds";

export default function EditarIngresoDialog({ ingreso, cuentas, onClose, onGuardado }) {
  const [fecha, setFecha] = useState(ingreso.fecha || "");
  const [categoria, setCategoria] = useState(ingreso.categoria || "");
  const [descripcion, setDescripcion] = useState(ingreso.descripcion || "");
  const [monto, setMonto] = useState(String(ingreso.monto));
  const [cuenta, setCuenta] = useState(ingreso.cuenta || "");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  // Identifica la fila original en la planilla (antes de aplicar los
  // cambios): no hay "hora" en Ingresos, así que se usa fecha + monto +
  // descripción tal como estaban cuando se cargó la lista.
  const criterio = { fecha: ingreso.fecha, monto: ingreso.monto, descripcion: ingreso.descripcion };

  async function guardar(e) {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (!fecha) {
      setError("Completá la fecha.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await editarIngreso(criterio, { fecha, categoria, descripcion, monto: montoNum, cuenta });
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
    if (!window.confirm(`¿Borrar el ingreso "${ingreso.descripcion || "(sin descripción)"}" de $${ingreso.monto}?`)) return;
    setBorrando(true);
    setError("");
    try {
      await borrarIngreso(criterio);
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
        <div className="dialog-title">Editar ingreso</div>
        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>Fecha</label>
            <input
              className="input"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="fila-2">
            <div className="field">
              <label>Monto</label>
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
            <div className="field">
              <label>Categoría</label>
              <input
                className="input"
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ej: Sueldo"
              />
            </div>
          </div>

          <div className="field">
            <label>Descripción</label>
            <input
              className="input"
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          {cuentas && cuentas.length > 0 && (
            <div className="field">
              <label>Cuenta</label>
              <select className="input" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                {cuentas.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
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

import { useState } from "react";
import { borrarGasto, editarGasto } from "../api";

export default function EditarGastoDialog({ gasto, categorias, onClose, onGuardado }) {
  const [categoria, setCategoria] = useState(gasto.categoria || "");
  const [descripcion, setDescripcion] = useState(gasto.descripcion || "");
  const [monto, setMonto] = useState(String(gasto.monto));
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  // Identifica la fila original en la planilla (antes de aplicar los
  // cambios): fecha + hora + monto tal como estaban cuando se cargó la lista.
  const criterio = { fecha: gasto.fecha, hora: gasto.hora, monto: gasto.monto };

  async function guardar(e) {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await editarGasto(criterio, { categoria, descripcion, monto: montoNum });
      onGuardado?.();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar el cambio.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar el gasto "${gasto.descripcion || "(sin descripción)"}" de $${gasto.monto}?`)) return;
    setBorrando(true);
    setError("");
    try {
      await borrarGasto(criterio);
      onGuardado?.();
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo borrar.");
      setBorrando(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Editar gasto</div>
        <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
              <select className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">(sin categoría)</option>
                {(categorias || []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
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

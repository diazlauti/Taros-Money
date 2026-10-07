import { useState } from "react";
import { crearSuscripcion } from "../api";
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import { playError, playSuccess } from "../sounds";
import EditarSuscripcionDialog from "./EditarSuscripcionDialog";

export default function RecurrentesTab({ suscripciones, categorias, cargando, error, onCambio }) {
  const [nombre, setNombre] = useState("");
  const [diaCobro, setDiaCobro] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [editando, setEditando] = useState(null);

  async function agregar(e) {
    e.preventDefault();
    const diaCobroNum = parseInt(diaCobro, 10);
    const montoNum = parseFloat(monto);
    if (!nombre.trim()) {
      setErrorForm("Completá el nombre.");
      return;
    }
    if (!diaCobroNum || diaCobroNum < 1 || diaCobroNum > 31) {
      setErrorForm("El día de cobro tiene que ser entre 1 y 31.");
      return;
    }
    if (!montoNum || montoNum <= 0) {
      setErrorForm("Ingresá un monto válido.");
      return;
    }
    setEnviando(true);
    setErrorForm("");
    try {
      await crearSuscripcion({ nombre: nombre.trim(), diaCobro: diaCobroNum, categoria, monto: montoNum });
      playSuccess();
      setNombre("");
      setDiaCobro("");
      setCategoria("");
      setMonto("");
      onCambio?.();
    } catch (err) {
      playError();
      setErrorForm(err.message || "No se pudo crear la suscripción.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) return <p className="mensaje-estado">Cargando recurrentes…</p>;
  if (error) return <p className="mensaje-estado">Todavía no está conectada esta sección ({error}).</p>;

  const total = (suscripciones || []).reduce((sum, s) => sum + (Number(s.monto) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {suscripciones && suscripciones.length > 0 && (
        <>
          <div className="card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <span className="card-kicker" style={{ margin: 0 }}>
              Total mensual recurrente
            </span>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoney(total)}</span>
          </div>
          <div className="grid-cards">
            {suscripciones.map((s, i) => (
              <div
                className="card"
                key={i}
                onClick={() => setEditando(s)}
                style={{ cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className={iconoPorCategoria(s.categoria)} />
                  <span className="card-title">{s.nombre}</span>
                </div>
                <span className="tag">{s.categoria}</span>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoney(s.monto)}/mes</span>
                  <span className="text-muted">próx. {fmtFecha(s.proximaFecha)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {(!suscripciones || suscripciones.length === 0) && (
        <p className="mensaje-estado">No hay gastos recurrentes cargados en la planilla.</p>
      )}

      <form className="card" onSubmit={agregar} style={{ maxWidth: 360 }}>
        <span className="card-kicker">Nueva suscripción</span>
        <div className="field">
          <label>Nombre</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Netflix" />
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
              placeholder="Ej: 10"
            />
          </div>
          <div className="field">
            <label>Monto mensual</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
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
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Agregar"}
        </button>
        {errorForm && <p className="mensaje-error">{errorForm}</p>}
      </form>

      {editando && (
        <EditarSuscripcionDialog
          suscripcion={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}
    </div>
  );
}

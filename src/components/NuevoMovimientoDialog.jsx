import { useEffect, useState } from "react";
import { agregarGasto, agregarIngreso } from "../api";
import { playError, playSuccess } from "../sounds";

function fechaHoraActual() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export default function NuevoMovimientoDialog({ categorias, cuentas, onClose, onGuardado }) {
  const cuentaTarjeta = (cuentas || []).find((c) => c.esTarjeta) || null;
  const primeraNoTarjeta = (cuentas || []).find((c) => !c.esTarjeta) || null;
  const [tipo, setTipo] = useState("gasto");
  const [form, setForm] = useState(() => ({
    ...fechaHoraActual(),
    monto: "",
    descripcion: "",
    categoria: "",
    cuenta: (cuentaTarjeta || primeraNoTarjeta)?.nombre || "",
  }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  // Un ingreso manual casi nunca entra directo a la tarjeta (la pensión, la
  // única plata que sí llega ahí, se carga sola por mail) — si cambiás a
  // "Ingreso" y hay otra cuenta, arrancamos ahí en vez de dejar "Cuscatlán"
  // puesto por inercia, que fue justo lo que pasó con el regalo de cumple
  // que quedó mal taggeado.
  useEffect(() => {
    const preferida = tipo === "ingreso"
      ? primeraNoTarjeta || cuentaTarjeta
      : cuentaTarjeta || primeraNoTarjeta;
    if (preferida) campo("cuenta", preferida.nombre);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function submit(e) {
    e.preventDefault();
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) {
      setError("Ingresá un monto válido.");
      return;
    }
    if (tipo === "gasto" && !form.hora) {
      setError("Completá la hora.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const payload = {
        fecha: form.fecha,
        hora: form.hora,
        monto,
        descripcion: form.descripcion,
        categoria: form.categoria,
      };
      // El backend acredita/descuenta solo de la cuenta elegida (o la deja
      // como "Cuscatlán" si no hay otra cuenta) en la misma llamada.
      if (tipo === "gasto") {
        await agregarGasto({ ...payload, cuenta: form.cuenta || undefined });
      } else {
        await agregarIngreso({ ...payload, cuenta: form.cuenta || undefined });
      }
      playSuccess();
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el movimiento.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Nuevo movimiento</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="seg">
            <label className="seg-opt">
              <input type="radio" name="tipo-mov" checked={tipo === "gasto"} onChange={() => setTipo("gasto")} />
              Gasto
            </label>
            <label className="seg-opt">
              <input type="radio" name="tipo-mov" checked={tipo === "ingreso"} onChange={() => setTipo("ingreso")} />
              Ingreso
            </label>
          </div>

          <div className="fila-2">
            <div className="field">
              <label>Fecha</label>
              <input className="input" type="date" value={form.fecha} onChange={(e) => campo("fecha", e.target.value)} required />
            </div>
            {tipo === "gasto" && (
              <div className="field">
                <label>Hora</label>
                <input className="input" type="time" value={form.hora} onChange={(e) => campo("hora", e.target.value)} required />
              </div>
            )}
          </div>

          <div className="field">
            <label>Monto</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={form.monto}
              onChange={(e) => campo("monto", e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Descripción</label>
            <input
              className="input"
              type="text"
              placeholder="Ej: Supermercado"
              value={form.descripcion}
              onChange={(e) => campo("descripcion", e.target.value)}
            />
          </div>

          <div className="fila-2">
            {cuentas && cuentas.length > 0 && (
              <div className="field">
                <label>Cuenta</label>
                <select className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                  {cuentas.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Categoría</label>
              <input
                className="input"
                type="text"
                list="lista-categorias"
                placeholder="Ej: Comida (o escribí una nueva)"
                value={form.categoria}
                onChange={(e) => campo("categoria", e.target.value)}
              />
              <datalist id="lista-categorias">
                {(categorias || []).map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
          {error && <p className="mensaje-error">{error}</p>}
        </form>
      </div>
    </div>
  );
}

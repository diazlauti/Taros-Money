import { useEffect, useState } from "react";
import { agregarGasto, agregarIngreso } from "../api";
import { useAvisos } from "../avisos";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { validarMovimiento } from "../validaciones";
import { playError, playSuccess } from "../sounds";
import { avisarAccionTour } from "../tour";
import Campo from "./Campo";
import CategoriaChips from "./CategoriaChips";
import Dialog from "./Dialog";

function fechaHoraActual() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export default function NuevoMovimientoDialog({ categorias, cuentas, onClose, onGuardado }) {
  const { avisar } = useAvisos();
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
  const v = useValidacion(form, (f) => validarMovimiento(f, tipo === "gasto"));

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
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      const payload = {
        fecha: form.fecha,
        hora: form.hora,
        monto: parseMonto(form.monto),
        descripcion: form.descripcion.trim(),
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
      avisar(tipo === "gasto" ? "Gasto guardado" : "Ingreso guardado");
      onGuardado?.();
      onClose();
      avisarAccionTour("movimiento-creado");
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el movimiento. Probá de nuevo.");
      setEnviando(false);
    }
  }

  const sucio = form.monto !== "" || form.descripcion !== "";

  return (
    <Dialog titulo="Nuevo movimiento" onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="seg" role="radiogroup" aria-label="Tipo de movimiento">
          <label className="seg-opt">
            <input type="radio" name="tipo-mov" checked={tipo === "gasto"} onChange={() => setTipo("gasto")} />
            Gasto
          </label>
          <label className="seg-opt">
            <input type="radio" name="tipo-mov" checked={tipo === "ingreso"} onChange={() => setTipo("ingreso")} />
            Ingreso
          </label>
        </div>

        <Campo etiqueta="Monto" error={v.visible("monto")}>
          {(p) => (
            <input
              {...p}
              data-autofocus
              className="input input-monto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={form.monto}
              onChange={(e) => campo("monto", e.target.value)}
              onBlur={() => v.tocar("monto")}
            />
          )}
        </Campo>

        <CategoriaChips categorias={categorias} valor={form.categoria} onChange={(c) => campo("categoria", c)} />

        <Campo etiqueta="Descripción (opcional)">
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              placeholder="Ej: Supermercado"
              value={form.descripcion}
              onChange={(e) => campo("descripcion", e.target.value)}
            />
          )}
        </Campo>

        {cuentas && cuentas.length > 0 && (
          <Campo etiqueta="Cuenta">
            {(p) => (
              <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                {cuentas.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}

        <div className="fila-2">
          <Campo etiqueta="Fecha" error={v.visible("fecha")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="date"
                value={form.fecha}
                onChange={(e) => campo("fecha", e.target.value)}
                onBlur={() => v.tocar("fecha")}
              />
            )}
          </Campo>
          {tipo === "gasto" && (
            <Campo etiqueta="Hora" error={v.visible("hora")}>
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="time"
                  value={form.hora}
                  onChange={(e) => campo("hora", e.target.value)}
                  onBlur={() => v.tocar("hora")}
                />
              )}
            </Campo>
          )}
        </div>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : error ? "Reintentar" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

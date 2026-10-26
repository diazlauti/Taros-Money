import { useState } from "react";
import { pagarServicio } from "../api";
import { useAvisos } from "../avisos";
import { fechaHoraActual, fmtMoney, mesActual, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { errorMonto } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";

// Marca un servicio como pagado este mes. El monto arranca con el
// aproximado, pero se puede cambiar (la boleta de la luz nunca es igual).
// Si "Registrarlo como gasto" está tildado, además se carga en Gastos y se
// descuenta de la cuenta, igual que un gasto cargado a mano.
export default function PagarServicioDialog({ servicio, cuentas, monedaPorCuenta = {}, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const ahora = fechaHoraActual();
  const cuentaInicial = servicio.cuenta && (cuentas || []).some((c) => c.nombre === servicio.cuenta) ? servicio.cuenta : (cuentas || [])[0]?.nombre || "";
  const [form, setForm] = useState({
    monto: servicio.monto ? String(servicio.monto).replace(".", ",") : "",
    fecha: ahora.fecha,
    cuenta: cuentaInicial,
    // Sin cuenta no se puede anotar el gasto: solo se marca como pagado.
    registrarGasto: (cuentas || []).length > 0,
  });
  const sinCuentas = !(cuentas || []).length;
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({ monto: errorMonto(f.monto), fecha: f.fecha ? "" : "Elegí la fecha." }));

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await pagarServicio(servicio.nombre, {
        mes: mesActual(),
        monto: parseMonto(form.monto),
        fecha: form.fecha,
        hora: fechaHoraActual().hora,
        cuenta: form.cuenta,
        registrarGasto: form.registrarGasto,
      });
      playSuccess();
      avisar(form.registrarGasto ? `${servicio.nombre} pagado y cargado como gasto` : `${servicio.nombre} marcado como pagado`);
      onGuardado?.(form.registrarGasto);
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo marcar como pagado. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <Dialog titulo={`Pagar ${servicio.nombre}`} onClose={onClose} sucio={false}>
      <form className="form" onSubmit={enviar} noValidate>
        <div className="fila-2">
          <Campo
            etiqueta="Cuánto pagaste"
            ayuda={servicio.monto ? `Aproximado: ${fmtMoney(servicio.monto, monedaPorCuenta[servicio.cuenta] || "ARS")}` : undefined}
            error={v.visible("monto")}
          >
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
          <Campo etiqueta="Fecha de pago" error={v.visible("fecha")}>
            {(p) => (
              <input {...p} className="input" type="date" value={form.fecha} onChange={(e) => campo("fecha", e.target.value)} />
            )}
          </Campo>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={form.registrarGasto}
            disabled={sinCuentas}
            onChange={(e) => campo("registrarGasto", e.target.checked)}
          />
          <span>
            Registrarlo como gasto
            <span className="texto-tenue texto-chico check-ayuda">
              {sinCuentas
                ? "Para anotarlo como gasto primero creá una cuenta en Cuentas."
                : "Destildalo si ya lo cargaste o te llega por mail."}
            </span>
          </span>
        </label>
        {form.registrarGasto && cuentas && cuentas.length > 0 && (
          <Campo etiqueta="Cuenta de la que sale">
            {(p) => (
              <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                {cuentas.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}
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
            {enviando ? "Guardando…" : error ? "Reintentar" : "Marcar pagado"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

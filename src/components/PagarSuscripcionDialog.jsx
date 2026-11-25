import { useState } from "react";
import { useAvisos } from "../avisos";
import { fechaHoraActual, fmtMoney, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { marcarSubPagada } from "../resumen";
import { agregarMovimiento } from "../sinConexion";
import { playError, playSuccess } from "../sounds";
import { errorMonto } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

// «Ya lo pagué» de una suscripción, desde el inicio. Igual que pagar un
// servicio: si «Registrarlo como gasto» está tildado, se carga en
// Movimientos y se descuenta de la cuenta elegida. Si no, solo deja de
// aparecer en «Para pagar» hasta el próximo cobro.
// `fechaCobro` es el día del cobro que se está pagando ("2026-11-27").
export default function PagarSuscripcionDialog({ suscripcion, fechaCobro, cuentas, monedaPorCuenta = {}, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const lista = cuentas || [];
  const sinCuentas = lista.length === 0;
  const cuentaInicial = lista.some((c) => c.nombre === suscripcion.cuenta) ? suscripcion.cuenta : lista[0]?.nombre || "";
  const [form, setForm] = useState({
    monto: suscripcion.monto ? String(suscripcion.monto).replace(".", ",") : "",
    fecha: fechaHoraActual().fecha,
    cuenta: cuentaInicial,
    registrarGasto: !sinCuentas,
  });
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
      let enCola = false;
      if (form.registrarGasto) {
        ({ enCola } = await agregarMovimiento("gasto", {
          fecha: form.fecha,
          hora: fechaHoraActual().hora,
          monto: parseMonto(form.monto),
          descripcion: suscripcion.nombre,
          categoria: suscripcion.categoria || "",
          cuenta: form.cuenta,
        }));
      }
      marcarSubPagada(suscripcion.nombre, fechaCobro);
      playSuccess();
      const texto = form.registrarGasto ? `${suscripcion.nombre} pagada y cargada como gasto` : `${suscripcion.nombre} marcada como pagada`;
      avisar(enCola ? `${texto}. Se sube cuando vuelva internet.` : texto);
      onGuardado?.(form.registrarGasto);
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <Dialog titulo={`Pagar ${suscripcion.nombre}`} onClose={onClose} sucio={false}>
      <form className="form" onSubmit={enviar} noValidate>
        <div className="fila-2">
          <Campo
            etiqueta="Cuánto pagaste"
            ayuda={suscripcion.monto ? `Por mes: ${fmtMoney(suscripcion.monto, monedaPorCuenta[suscripcion.cuenta] || "ARS")}` : undefined}
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
        {form.registrarGasto && !sinCuentas && (
          <Campo etiqueta="Cuenta o tarjeta">
            {(p) => (
              <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                {lista.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre} ({c.moneda})
                  </option>
                ))}
              </select>
            )}
          </Campo>
        )}
        {error && <MensajeError>{error}</MensajeError>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : error ? "Reintentar" : "Ya lo pagué"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

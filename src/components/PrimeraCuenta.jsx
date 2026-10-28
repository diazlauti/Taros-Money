import { useState } from "react";
import { crearCuenta } from "../api";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playClick, playError, playSuccess } from "../sounds";
import Campo from "./Campo";
import MensajeError from "./MensajeError";

const SUGERIDAS = ["Efectivo", "Mercado Pago", "Banco"];

// Sin ninguna cuenta, un gasto no tiene de dónde salir (antes quedaba en
// "Cuscatlán", la tarjeta en dólares de lauti, y el resumen lo multiplicaba
// por la cotización). Se crea acá mismo para no cortar la carga.
export default function PrimeraCuenta({ onCreada, onCancelar }) {
  const [form, setForm] = useState({ nombre: "", saldo: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({
    nombre: f.nombre.trim() ? "" : "Escribí un nombre o tocá una de las opciones.",
    saldo: f.saldo.trim() && !(parseMonto(f.saldo) >= 0) ? "Escribí solo números, por ejemplo 15000 o 15000,50." : "",
  }));

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function crear(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    const cuenta = { nombre: form.nombre.trim(), saldo: parseMonto(form.saldo) || 0, moneda: "ARS" };
    try {
      await crearCuenta(cuenta);
      playSuccess();
      onCreada(cuenta);
    } catch (err) {
      playError();
      setError(err.message || "No se pudo crear la cuenta. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <form className="form" onSubmit={crear} noValidate>
      <p className="aviso-inline">
        <i className="ph ph-wallet" aria-hidden="true" />
        <span>
          <strong>Antes, creá una cuenta.</strong> Es de donde sale la plata de tus gastos (efectivo, Mercado Pago, tu
          banco). Después podés sumar más desde la pestaña Cuentas.
        </span>
      </p>

      <fieldset className="field">
        <legend>Elegí una o escribí otra</legend>
        <div className="chips">
          {SUGERIDAS.map((s) => (
            <button
              type="button"
              key={s}
              className="chip"
              aria-pressed={form.nombre === s}
              onClick={() => {
                playClick();
                campo("nombre", s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <Campo etiqueta="Nombre de la cuenta" error={v.visible("nombre")}>
        {(p) => (
          <input
            {...p}
            data-autofocus
            className="input"
            type="text"
            autoComplete="off"
            placeholder="Ej: Efectivo"
            value={form.nombre}
            onChange={(e) => campo("nombre", e.target.value)}
          />
        )}
      </Campo>

      <Campo
        etiqueta="¿Cuánta plata tenés ahí hoy? (opcional)"
        ayuda="En pesos. Si no sabés, dejalo vacío y lo ajustás después."
        error={v.visible("saldo")}
      >
        {(p) => (
          <input
            {...p}
            className="input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={form.saldo}
            onChange={(e) => campo("saldo", e.target.value)}
            onBlur={() => v.tocar("saldo")}
          />
        )}
      </Campo>

      {error && (
        <MensajeError>{error}</MensajeError>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={enviando}>
          {enviando ? "Creando…" : error ? "Reintentar" : "Crear cuenta y seguir"}
        </button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { errorMonto } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

// Pide un monto en un diálogo propio (reemplaza al window.prompt de antes).
// Con "permitirCero" acepta 0 (por ejemplo, el saldo real de una cuenta vacía).
export default function MontoDialog({ titulo, etiqueta, ayuda, placeholder = "0", permitirCero = false, textoBoton, onConfirmar, onClose }) {
  const [form, setForm] = useState({ monto: "" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({
    monto:
      permitirCero && parseMonto(f.monto) === 0
        ? ""
        : errorMonto(f.monto, { mensaje: permitirCero ? "Escribí solo números, por ejemplo 15000 o 15000,50." : undefined }),
  }));

  async function enviar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await onConfirmar(parseMonto(form.monto));
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <Dialog titulo={titulo} onClose={onClose} sucio={form.monto !== "" && !enviando}>
      <form className="form" onSubmit={enviar} noValidate>
        <Campo etiqueta={etiqueta} ayuda={ayuda} error={v.visible("monto")}>
          {(p) => (
            <input
              {...p}
              data-autofocus
              className="input input-monto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={placeholder}
              value={form.monto}
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              onBlur={() => v.tocar("monto")}
            />
          )}
        </Campo>
        {error && (
          <MensajeError>{error}</MensajeError>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Guardando…" : error ? "Reintentar" : textoBoton}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

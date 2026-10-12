import { useState } from "react";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { errorMonto } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";

// Pide un monto en un diálogo propio (reemplaza al window.prompt de antes).
// Con "conSigno", deja elegir Sumar o Restar en vez de pedir un negativo.
export default function MontoDialog({ titulo, etiqueta, ayuda, conSigno = false, textoBoton, onConfirmar, onClose }) {
  const [form, setForm] = useState({ monto: "", signo: "sumar" });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({ monto: errorMonto(f.monto) }));

  async function enviar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      const n = parseMonto(form.monto);
      await onConfirmar(conSigno && form.signo === "restar" ? -n : n);
      onClose();
    } catch (err) {
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  return (
    <Dialog titulo={titulo} onClose={onClose} sucio={form.monto !== "" && !enviando}>
      <form className="form" onSubmit={enviar} noValidate>
        {conSigno && (
          <div className="seg" role="radiogroup" aria-label="Qué querés hacer">
            {[
              ["sumar", "Sumar"],
              ["restar", "Restar"],
            ].map(([valor, texto]) => (
              <label className="seg-opt" key={valor}>
                <input
                  type="radio"
                  name="signo"
                  checked={form.signo === valor}
                  onChange={() => setForm((f) => ({ ...f, signo: valor }))}
                />
                {texto}
              </label>
            ))}
          </div>
        )}
        <Campo etiqueta={etiqueta} ayuda={ayuda} error={v.visible("monto")}>
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
              onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
              onBlur={() => v.tocar("monto")}
            />
          )}
        </Campo>
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
            {enviando ? "Guardando…" : error ? "Reintentar" : textoBoton}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

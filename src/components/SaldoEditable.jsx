import { useEffect, useRef, useState } from "react";
import { fmtMoney, parseMonto } from "../format";
import MensajeError from "./MensajeError";

// El saldo de una cuenta, que se toca y se cambia ahí mismo. Enter guarda,
// Escape cancela. onGuardar recibe el saldo real (puede ser 0).
export default function SaldoEditable({ cuenta, onGuardar }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  const boton = useRef(null);
  const moneda = cuenta.moneda || "ARS";

  useEffect(() => {
    if (editando) input.current?.select();
  }, [editando]);

  function abrir() {
    setTexto(String(Number(cuenta.saldo) || 0).replace(".", ","));
    setError("");
    setEditando(true);
  }

  function cerrar() {
    setEditando(false);
    setError("");
    // Que el foco vuelva al saldo, no se pierda.
    requestAnimationFrame(() => boton.current?.focus());
  }

  async function guardar(e) {
    e.preventDefault();
    const valor = parseMonto(texto);
    if (!texto.trim() || !(valor >= 0)) {
      setError("Escribí solo números, por ejemplo 15000 o 15000,50.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await onGuardar(valor);
      cerrar();
    } catch (err) {
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (!editando) {
    return (
      <button
        ref={boton}
        type="button"
        className="saldo-editable"
        onClick={abrir}
        aria-label={`Saldo de ${cuenta.nombre}: ${fmtMoney(cuenta.saldo, moneda)}. Tocá para cambiarlo`}
      >
        <span className="monto-medio">{fmtMoney(cuenta.saldo, moneda)}</span>
        <i className="ph ph-pencil-simple-line texto-tenue" aria-hidden="true" />
      </button>
    );
  }

  return (
    <form className="saldo-editable-form" onSubmit={guardar} noValidate>
      <div className="saldo-editable-fila">
        <input
          ref={input}
          className="input input-monto"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          aria-label={`Saldo real de ${cuenta.nombre} (${moneda})`}
          aria-invalid={error ? true : undefined}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              cerrar();
            }
          }}
          disabled={enviando}
        />
        <button type="submit" className="btn btn-primary btn-icono-borde" disabled={enviando} aria-label="Guardar saldo">
          <i className={enviando ? "ph ph-spinner" : "ph ph-check"} aria-hidden="true" />
        </button>
        <button type="button" className="btn btn-secondary btn-icono-borde" onClick={cerrar} disabled={enviando} aria-label="Cancelar">
          <i className="ph ph-x" aria-hidden="true" />
        </button>
      </div>
      {error && <MensajeError>{error}</MensajeError>}
    </form>
  );
}

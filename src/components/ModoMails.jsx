import { useId, useState } from "react";
import { useAvisos } from "../avisos";
import { playError, playSuccess } from "../sounds";

const OPCIONES = [
  ["apagado", "Apagado", "No se lee ningún mail."],
  ["al_abrir", "Al abrir la app", "Se fija cada vez que entrás."],
  ["boton", "Con un botón", "Solo cuando tocás «Revisar mis mails»."],
  ["siempre", "Siempre", "Cada media hora, aunque no abras la app."],
];

// Cuándo se revisan los mails. onCambiar se llama directo desde el click:
// la primera vez abre la ventana de Google para dar permiso de leer Gmail.
export default function ModoMails({ modo, onCambiar }) {
  const nombre = useId();
  const { avisar } = useAvisos();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function cambiar(valor) {
    setGuardando(true);
    setError("");
    try {
      await onCambiar(valor);
      playSuccess();
      if (valor === "apagado") avisar("Listo, ya no se revisan tus mails");
    } catch (err) {
      playError();
      setError(err.message || "No se pudo cambiar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <fieldset className="field" disabled={guardando}>
      <legend>Cuándo revisarlos</legend>
      <div className="seg seg-vertical">
        {OPCIONES.map(([valor, texto, ayuda]) => (
          <label className="seg-opt" key={valor}>
            <input type="radio" name={nombre} checked={modo === valor} onChange={() => cambiar(valor)} />
            <span className="seg-opt-texto">
              {texto}
              <span className="seg-opt-ayuda">{ayuda}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="field-ayuda" aria-live="polite">
        {guardando ? "Guardando…" : ""}
      </p>
      {error && (
        <p className="mensaje-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

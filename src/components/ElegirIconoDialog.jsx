import { useId, useState } from "react";
import { ICONOS_ELEGIBLES, iconoDeCategoria, iconoElegido } from "../iconos";
import { playError, playSuccess } from "../sounds";
import Dialog from "./Dialog";

// Grilla de íconos para elegir el de una categoría. Se puede volver al de
// siempre (el que sale según el nombre).
export default function ElegirIconoDialog({ categoria, onGuardar, onClose }) {
  const nombre = useId();
  const [valor, setValor] = useState(() => iconoElegido(categoria) || iconoDeCategoria(categoria));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(icono) {
    setGuardando(true);
    setError("");
    try {
      await onGuardar(categoria, icono);
      playSuccess();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el ícono. Probá de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <Dialog titulo={`Ícono para «${categoria}»`} onClose={onClose}>
      <form
        className="pila"
        onSubmit={(e) => {
          e.preventDefault();
          guardar(valor);
        }}
      >
        <fieldset className="field">
          <legend className="visualmente-oculto">Elegí un ícono</legend>
          <div className="iconos-grilla">
            {ICONOS_ELEGIBLES.map(([icono, texto]) => (
              <label className="icono-opcion" key={icono} title={texto}>
                <input
                  type="radio"
                  name={nombre}
                  value={icono}
                  checked={valor === icono}
                  onChange={() => setValor(icono)}
                  data-autofocus={valor === icono ? true : undefined}
                />
                <i className={icono} aria-hidden="true" />
                <span className="visualmente-oculto">{texto}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions dialog-actions--separadas">
          <button type="button" className="btn btn-texto" onClick={() => guardar("")} disabled={guardando}>
            Usar el de siempre
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : error ? "Reintentar" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

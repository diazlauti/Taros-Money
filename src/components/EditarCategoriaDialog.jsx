import { useId, useState } from "react";
import { ICONOS_ELEGIBLES, iconoDeCategoria } from "../iconos";
import { playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

// Tocar una categoría abre esto: cambiarle el nombre y el ícono en un solo
// lugar. El nombre nuevo también se cambia en lo que ya estaba cargado.
export default function EditarCategoriaDialog({ categoria, otras, onGuardar, onClose }) {
  const grupo = useId();
  const [nombre, setNombre] = useState(categoria);
  const [icono, setIcono] = useState(() => iconoDeCategoria(categoria));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [intentado, setIntentado] = useState(false);

  const cambioNombre = nombre.trim() !== categoria;
  const errorNombre = cambioNombre ? errorNombreNuevo(nombre, otras, "categoría") : "";
  const sucio = cambioNombre || icono !== iconoDeCategoria(categoria);

  async function guardar(e) {
    e.preventDefault();
    setIntentado(true);
    if (errorNombre) return;
    if (!sucio) return onClose();
    setGuardando(true);
    setError("");
    try {
      await onGuardar(categoria, { nombre: nombre.trim(), icono });
      playSuccess();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setGuardando(false);
    }
  }

  return (
    <Dialog titulo="Editar categoría" onClose={onClose} sucio={sucio && !guardando}>
      <form className="pila" onSubmit={guardar} noValidate>
        <Campo
          etiqueta="Nombre"
          ayuda={cambioNombre ? "También se cambia en los gastos, ingresos y suscripciones que ya la usan." : ""}
          error={intentado || cambioNombre ? errorNombre : ""}
        >
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              autoComplete="off"
              maxLength={60}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              data-autofocus
            />
          )}
        </Campo>

        <fieldset className="field">
          <legend>Ícono</legend>
          <div className="iconos-grilla">
            {ICONOS_ELEGIBLES.map(([valor, texto]) => (
              <label className="icono-opcion" key={valor} title={texto}>
                <input type="radio" name={grupo} value={valor} checked={icono === valor} onChange={() => setIcono(valor)} />
                <i className={valor} aria-hidden="true" />
                <span className="visualmente-oculto">{texto}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <MensajeError>{error}</MensajeError>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn btn-texto" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : error ? "Reintentar" : "Guardar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

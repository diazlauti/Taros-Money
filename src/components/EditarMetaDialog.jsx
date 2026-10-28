import { useState } from "react";
import { borrarMeta, editarMeta } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playClick, playError, playSuccess } from "../sounds";
import { errorMonto, errorNombreNuevo } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

const aTexto = (n) => (n ? String(n).replace(".", ",") : "0");

// Cambiar nombre, objetivo o lo ahorrado de una meta, o borrarla.
export default function EditarMetaDialog({ meta, otrosNombres, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const inicial = { nombre: meta.nombre, objetivo: aTexto(meta.objetivo), actual: aTexto(meta.actual) };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({
    nombre: errorNombreNuevo(f.nombre, otrosNombres, "meta"),
    objetivo: errorMonto(f.objetivo),
    actual: String(f.actual).trim() && !(parseMonto(f.actual) >= 0) ? "Escribí solo números, por ejemplo 15000." : "",
  }));
  const sucio = Object.keys(inicial).some((k) => inicial[k] !== form[k]);

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!sucio) return onClose();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await editarMeta(meta.nombre, {
        nombre: form.nombre.trim(),
        objetivo: parseMonto(form.objetivo),
        actual: parseMonto(form.actual) || 0,
      });
      playSuccess();
      avisar("Meta guardada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!(await confirmar({ titulo: `¿Borrar la meta "${meta.nombre}"?`, texto: "No se puede deshacer.", si: "Borrar", peligro: true }))) return;
    setBorrando(true);
    setError("");
    try {
      await borrarMeta(meta.nombre);
      playClick();
      avisar("Meta borrada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo borrar. Probá de nuevo.");
      setBorrando(false);
    }
  }

  return (
    <Dialog titulo="Editar meta" onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={guardar} noValidate>
        <Campo etiqueta="Nombre" error={v.visible("nombre")}>
          {(p) => (
            <input
              {...p}
              data-autofocus
              className="input"
              value={form.nombre}
              onChange={(e) => campo("nombre", e.target.value)}
              onBlur={() => v.tocar("nombre")}
            />
          )}
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Cuánto querés juntar" error={v.visible("objetivo")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.objetivo}
                onChange={(e) => campo("objetivo", e.target.value)}
                onBlur={() => v.tocar("objetivo")}
              />
            )}
          </Campo>
          <Campo etiqueta="Lo que llevás" error={v.visible("actual")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.actual}
                onChange={(e) => campo("actual", e.target.value)}
                onBlur={() => v.tocar("actual")}
              />
            )}
          </Campo>
        </div>
        {error && (
          <MensajeError>{error}</MensajeError>
        )}
        <div className="dialog-actions dialog-actions--separadas">
          <button type="button" className="btn btn-secondary btn-peligro" onClick={borrar} disabled={borrando || enviando}>
            <i className="ph ph-trash" aria-hidden="true" />
            {borrando ? "Borrando…" : "Borrar"}
          </button>
          <div className="fila">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando || borrando}>
              {enviando ? "Guardando…" : error ? "Reintentar" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

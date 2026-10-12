import { useState } from "react";
import { borrarSuscripcion, editarSuscripcion } from "../api";
import { useAvisos } from "../avisos";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playClick, playError, playSuccess } from "../sounds";
import { validarSuscripcion } from "../validaciones";
import CamposSuscripcion from "./CamposSuscripcion";
import Dialog from "./Dialog";

export default function EditarSuscripcionDialog({ suscripcion, categorias, cuentas, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const inicial = {
    nombre: suscripcion.nombre || "",
    diaCobro: String(suscripcion.diaCobro || ""),
    categoria: suscripcion.categoria || "",
    monto: String(suscripcion.monto ?? "").replace(".", ","),
    cuenta: suscripcion.cuenta || "",
  };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, validarSuscripcion);

  // Identifica la fila original por nombre (tal como estaba cuando se cargó
  // la lista): es el único dato que la planilla usa para encontrarla.
  const nombreOriginal = suscripcion.nombre;

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await editarSuscripcion(nombreOriginal, {
        nombre: form.nombre.trim(),
        diaCobro: Number(form.diaCobro),
        categoria: form.categoria,
        monto: parseMonto(form.monto),
        cuenta: form.cuenta,
      });
      playSuccess();
      avisar("Suscripción guardada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el cambio. Probá de nuevo.");
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar la suscripción "${suscripcion.nombre}"? No se puede deshacer.`)) return;
    setBorrando(true);
    setError("");
    try {
      await borrarSuscripcion(nombreOriginal);
      playClick();
      avisar("Suscripción borrada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo borrar. Probá de nuevo.");
      setBorrando(false);
    }
  }

  const sucio = Object.keys(inicial).some((k) => inicial[k] !== form[k]);

  return (
    <Dialog titulo="Editar suscripción" onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={guardar} noValidate>
        <CamposSuscripcion form={form} campo={campo} v={v} categorias={categorias} cuentas={cuentas} autoFocus />

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions dialog-actions--separadas">
          <button
            type="button"
            className="btn btn-secondary btn-peligro"
            onClick={borrar}
            disabled={borrando || enviando}
          >
            <i className="ph ph-trash" aria-hidden="true" />
            {borrando ? "Borrando…" : "Borrar"}
          </button>
          <div className="fila">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando || borrando}>
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

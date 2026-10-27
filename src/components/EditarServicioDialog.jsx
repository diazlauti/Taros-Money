import { useState } from "react";
import { borrarServicio, editarServicio } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playClick, playError, playSuccess } from "../sounds";
import { validarServicio } from "../validaciones";
import CamposServicio from "./CamposServicio";
import Dialog from "./Dialog";

export default function EditarServicioDialog({ servicio, categorias, cuentas, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const inicial = {
    nombre: servicio.nombre || "",
    diaVencimiento: String(servicio.diaVencimiento || ""),
    categoria: servicio.categoria || "",
    monto: servicio.monto ? String(servicio.monto).replace(".", ",") : "",
    cuenta: servicio.cuenta || "",
  };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, validarServicio);
  const nombreOriginal = servicio.nombre;

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await editarServicio(nombreOriginal, {
        nombre: form.nombre.trim(),
        diaVencimiento: Number(form.diaVencimiento),
        categoria: form.categoria,
        monto: parseMonto(form.monto) || 0,
        cuenta: form.cuenta,
      });
      playSuccess();
      avisar("Servicio guardado");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el cambio. Probá de nuevo.");
      setEnviando(false);
    }
  }

  async function borrar() {
    if (!(await confirmar({ titulo: `¿Borrar el servicio "${servicio.nombre}"?`, texto: "Los gastos que ya registraste quedan como están.", si: "Borrar", peligro: true }))) return;
    setBorrando(true);
    setError("");
    try {
      await borrarServicio(nombreOriginal);
      playClick();
      avisar("Servicio borrado");
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
    <Dialog titulo="Editar servicio" onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={guardar} noValidate>
        <CamposServicio form={form} campo={campo} v={v} categorias={categorias} cuentas={cuentas} autoFocus />
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
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

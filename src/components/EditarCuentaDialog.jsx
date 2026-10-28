import { useState } from "react";
import { borrarCuenta, renombrarCuenta } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { fmtMoney } from "../format";
import { useValidacion } from "../hooks";
import { playBorrar, playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

// Renombrar o borrar una cuenta. Al renombrar, el backend también cambia el
// nombre en los gastos, ingresos, suscripciones y servicios que la usan.
export default function EditarCuentaDialog({ cuenta, otrosNombres, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const [nombre, setNombre] = useState(cuenta.nombre);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion({ nombre }, (f) => ({ nombre: errorNombreNuevo(f.nombre, otrosNombres, "cuenta") }));
  const sucio = nombre.trim() !== cuenta.nombre;

  async function guardar(e) {
    e.preventDefault();
    if (!sucio) return onClose();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      await renombrarCuenta(cuenta.nombre, nombre.trim());
      playSuccess();
      avisar("Cuenta renombrada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo renombrar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  async function borrar() {
    const saldo = Number(cuenta.saldo) || 0;
    const aviso = saldo !== 0 ? ` Todavía tiene ${fmtMoney(saldo, cuenta.moneda)}.` : "";
    if (!(await confirmar({ titulo: `¿Borrar la cuenta "${cuenta.nombre}"?`, texto: `${aviso.trim()} Los movimientos que ya cargaste quedan como están.`.trim(), si: "Borrar", peligro: true }))) return;
    setBorrando(true);
    setError("");
    try {
      await borrarCuenta(cuenta.nombre);
      playBorrar();
      avisar("Cuenta borrada");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo borrar. Probá de nuevo.");
      setBorrando(false);
    }
  }

  return (
    <Dialog titulo={`Editar ${cuenta.nombre}`} onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={guardar} noValidate>
        <Campo etiqueta="Nombre" explicacion="Si le cambiás el nombre, también se cambia en los movimientos que ya cargaste." error={v.visible("nombre")}>
          {(p) => (
            <input
              {...p}
              data-autofocus
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={() => v.tocar("nombre")}
            />
          )}
        </Campo>
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

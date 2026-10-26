import { useState } from "react";
import {
  agregarGasto,
  agregarIngreso,
  borrarGasto,
  borrarIngreso,
  confirmarGastoDeMail,
  descartarGastoDeMail,
  editarGasto,
  editarIngreso,
  ignorarRemitenteMail,
} from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { fmtMoney, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playClick, playError, playSuccess } from "../sounds";
import { avisarAccionTour } from "../tour";
import { validarMovimiento } from "../validaciones";
import Campo from "./Campo";
import CategoriaChips from "./CategoriaChips";
import Dialog from "./Dialog";

// Editar o borrar un gasto o un ingreso (mismo formulario; los ingresos no
// tienen hora en la planilla).
export default function EditarMovimientoDialog({ movimiento, tipo, categorias, cuentas, monedaPorCuenta, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const esGasto = tipo === "gasto";
  // Vino de un remitente desconocido: todavía no está en la planilla.
  const sinConfirmar = esGasto && movimiento.sinConfirmar;
  // Lo que eligió la última vez que confirmó un gasto en este comercio.
  const sugerencia = esGasto && movimiento.aRevisar && !movimiento.categoria ? movimiento.sugerencia : null;
  const cuentaSugerida = cuentas?.some((c) => c.nombre === sugerencia?.cuenta) ? sugerencia.cuenta : "";
  const inicial = {
    fecha: movimiento.fecha || "",
    hora: movimiento.hora || "",
    categoria: sugerencia?.categoria || movimiento.categoria || "",
    descripcion: movimiento.descripcion || "",
    monto: String(movimiento.monto ?? "").replace(".", ","),
    cuenta: cuentaSugerida || movimiento.cuenta || "",
  };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  // Mercado Pago no se ofrece: ignorarlo cortaría todos sus gastos.
  const puedeIgnorar = movimiento.aRevisar && movimiento.origenMail && movimiento.origenMail !== "Mercado Pago";
  const [ignorar, setIgnorar] = useState(false);
  const v = useValidacion(form, (f) => validarMovimiento(f, esGasto));

  // Identifica la fila original en la planilla (antes de aplicar los
  // cambios). Gastos: fecha + hora + monto. Ingresos no tienen "hora", así
  // que se usa fecha + monto + descripción, tal como estaban al cargar.
  const criterio = esGasto
    ? { fecha: movimiento.fecha, hora: movimiento.hora, monto: movimiento.monto }
    : { fecha: movimiento.fecha, monto: movimiento.monto, descripcion: movimiento.descripcion };

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    const cambios = {
      fecha: form.fecha,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      monto: parseMonto(form.monto),
      cuenta: form.cuenta,
      ...(esGasto ? { hora: form.hora } : {}),
    };
    try {
      if (sinConfirmar) await confirmarGastoDeMail(movimiento.idMail, cambios);
      else await (esGasto ? editarGasto : editarIngreso)(criterio, cambios);
      playSuccess();
      avisar(movimiento.aRevisar ? (esGasto ? "Gasto confirmado" : "Ingreso confirmado") : "Cambios guardados");
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el cambio. Probá de nuevo.");
      setEnviando(false);
    }
  }

  // Vuelve a cargar el movimiento tal como estaba (la planilla también
  // vuelve a descontarlo o sumarlo de la cuenta, igual que al cargarlo).
  async function deshacerBorrado() {
    const original = {
      fecha: movimiento.fecha,
      categoria: movimiento.categoria || "",
      descripcion: movimiento.descripcion || "",
      monto: movimiento.monto,
      cuenta: movimiento.cuenta,
      ...(esGasto ? { hora: movimiento.hora } : {}),
    };
    try {
      await (esGasto ? agregarGasto : agregarIngreso)(original);
      playSuccess();
      avisar(esGasto ? "Listo, el gasto volvió" : "Listo, el ingreso volvió");
      onGuardado?.();
    } catch (err) {
      playError();
      avisar(err.message || "No pude volver a cargarlo. Cargalo de nuevo a mano.", "error");
    }
  }

  async function borrar() {
    // Borrar se puede deshacer desde el aviso, así que no pregunta. Descartar
    // un gasto de un mail sin confirmar no, así que ahí sí.
    if (sinConfirmar) {
      const monto = fmtMoney(movimiento.monto, monedaPorCuenta?.[movimiento.cuenta] || "ARS");
      const nombre = movimiento.descripcion || "sin descripción";
      const seguro = await confirmar({
        titulo: `¿Descartar "${nombre}" de ${monto}?`,
        texto: "No se va a sumar a tus gastos.",
        si: "Descartar",
        peligro: true,
      });
      if (!seguro) return;
    }
    setBorrando(true);
    setError("");
    try {
      if (sinConfirmar) await descartarGastoDeMail(movimiento.idMail);
      else await (esGasto ? borrarGasto : borrarIngreso)(criterio);
      playClick();
      if (sinConfirmar) avisar("Gasto descartado");
      else avisar(esGasto ? "Gasto borrado" : "Ingreso borrado", "exito", { accion: "Deshacer", onAccion: deshacerBorrado });
      if (puedeIgnorar && ignorar) {
        ignorarRemitenteMail(movimiento.origenMail)
          .then(() => avisar(`Listo: no vamos a mostrar más mails de ${movimiento.origenMail}`))
          .catch(() => avisar(`No pude guardar que ignores a ${movimiento.origenMail}. Probá desde Configuración.`));
      }
      onGuardado?.();
      onClose();
      avisarAccionTour("movimiento-borrado");
    } catch (err) {
      playError();
      setError(err.message || "No se pudo borrar. Probá de nuevo.");
      setBorrando(false);
    }
  }

  const sucio = Object.keys(inicial).some((k) => inicial[k] !== form[k]);

  return (
    <Dialog
      titulo={movimiento.aRevisar ? (esGasto ? "Revisar gasto" : "Revisar ingreso") : esGasto ? "Editar gasto" : "Editar ingreso"}
      onClose={onClose}
      sucio={sucio && !enviando}
    >
      <form className="form" onSubmit={guardar} noValidate>
        {movimiento.aRevisar && (
          <p className="aviso-inline">
            <i className="ph ph-envelope-simple" aria-hidden="true" />
            Lo encontramos en un mail de {movimiento.origenMail}. Revisá el monto, elegí la categoría y la cuenta, y
            confirmalo.
            {sinConfirmar && " Como no conocemos a ese remitente, no lo sumamos a tus gastos hasta que lo confirmes."}
            {sugerencia?.categoria && ` Elegimos la categoría que usaste la última vez en ${movimiento.descripcion}.`}
          </p>
        )}
        <Campo etiqueta="Monto" error={v.visible("monto")}>
          {(p) => (
            <input
              {...p}
              className="input input-monto"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={form.monto}
              onChange={(e) => campo("monto", e.target.value)}
              onBlur={() => v.tocar("monto")}
            />
          )}
        </Campo>

        <CategoriaChips categorias={categorias} valor={form.categoria} onChange={(c) => campo("categoria", c)} />

        <Campo etiqueta="Descripción (opcional)">
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              value={form.descripcion}
              onChange={(e) => campo("descripcion", e.target.value)}
            />
          )}
        </Campo>

        {cuentas && cuentas.length > 0 && (
          <Campo etiqueta="Cuenta">
            {(p) => (
              <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                {cuentas.map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
                {/* Si la cuenta ya se borró, igual se muestra la del movimiento:
                    sin esto el select mostraba otra cuenta y guardaba la vieja. */}
                {form.cuenta && !cuentas.some((c) => c.nombre === form.cuenta) && (
                  <option value={form.cuenta}>{form.cuenta} (borrada)</option>
                )}
              </select>
            )}
          </Campo>
        )}

        <div className="fila-2">
          <Campo etiqueta="Fecha" error={v.visible("fecha")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="date"
                value={form.fecha}
                onChange={(e) => campo("fecha", e.target.value)}
                onBlur={() => v.tocar("fecha")}
              />
            )}
          </Campo>
          {esGasto && (
            <Campo etiqueta="Hora" error={v.visible("hora")}>
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="time"
                  value={form.hora}
                  onChange={(e) => campo("hora", e.target.value)}
                  onBlur={() => v.tocar("hora")}
                />
              )}
            </Campo>
          )}
        </div>

        {puedeIgnorar && (
          <label className="check">
            <input type="checkbox" checked={ignorar} onChange={(e) => setIgnorar(e.target.checked)} />
            <span>
              Si lo {sinConfirmar ? "descarto" : "borro"}, ignorar los mails de {movimiento.origenMail}
              <span className="field-ayuda">Lo podés deshacer en Configuración.</span>
            </span>
          </label>
        )}

        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions dialog-actions--separadas">
          <button
            type="button"
            className="btn btn-secondary btn-peligro"
            data-tour="borrar-movimiento"
            onClick={borrar}
            disabled={borrando || enviando}
          >
            <i className="ph ph-trash" aria-hidden="true" />
            {borrando ? (sinConfirmar ? "Descartando…" : "Borrando…") : sinConfirmar ? "Descartar" : "Borrar"}
          </button>
          <div className="fila">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando || borrando}>
              {enviando ? "Guardando…" : movimiento.aRevisar ? "Confirmar" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

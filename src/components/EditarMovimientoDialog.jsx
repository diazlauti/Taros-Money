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
import { playBorrar, playDeshacer, playError, playSuccess } from "../sounds";
import { avisarAccionTour } from "../tour";
import { validarMovimiento } from "../validaciones";
import Campo from "./Campo";
import CategoriaChips from "./CategoriaChips";
import Dialog from "./Dialog";
import MensajeError from "./MensajeError";

// Editar o borrar un gasto o un ingreso (mismo formulario; los ingresos no
// tienen hora en la planilla).
export default function EditarMovimientoDialog({ movimiento, tipo, categorias, cuentas, monedaPorCuenta, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const esGasto = tipo === "gasto";
  // Vino de un remitente desconocido: todavía no está en la planilla.
  const sinConfirmar = esGasto && movimiento.sinConfirmar;
  // El mail de la compra no decía el precio: el monto arranca vacío.
  const sinMonto = sinConfirmar && movimiento.sinMonto;
  // Lo que eligió la última vez que confirmó un gasto en este comercio.
  const sugerencia = esGasto && movimiento.aRevisar && !movimiento.categoria ? movimiento.sugerencia : null;
  const cuentaSugerida = cuentas?.some((c) => c.nombre === sugerencia?.cuenta) ? sugerencia.cuenta : "";
  // Un gasto sin confirmar todavía no tiene cuenta (antes llegaba como
  // "Cuscatlán" y el select mostraba "Cuscatlán (borrada)"): arranca en la
  // primera cuenta de la persona.
  // Si el mail vino en otra moneda (Steam cobra en dólares), arranca en una
  // cuenta de esa moneda.
  const monedaMail = sinConfirmar ? movimiento.moneda || "ARS" : "ARS";
  const cuentaDeLaMoneda = cuentas?.find((c) => (c.moneda || "ARS") === monedaMail)?.nombre;
  const cuentaInicial =
    sinConfirmar && !cuentas?.some((c) => c.nombre === movimiento.cuenta)
      ? cuentaDeLaMoneda || cuentas?.[0]?.nombre || ""
      : movimiento.cuenta || "";
  const inicial = {
    fecha: movimiento.fecha || "",
    hora: movimiento.hora || "",
    categoria: sugerencia?.categoria || movimiento.categoria || "",
    descripcion: movimiento.descripcion || "",
    monto: sinMonto ? "" : String(movimiento.monto ?? "").replace(".", ","),
    cuenta: cuentaSugerida || cuentaInicial,
  };
  const [form, setForm] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  // Mercado Pago no se ofrece: ignorarlo cortaría todos sus gastos.
  // Lo mandó por WhatsApp: no vino de un mail, no hay remitente para ignorar.
  const deWhatsApp = movimiento.origenMail === "WhatsApp";
  const puedeIgnorar = movimiento.aRevisar && movimiento.origenMail && movimiento.origenMail !== "Mercado Pago" && !deWhatsApp;
  const [ignorar, setIgnorar] = useState(false);
  const v = useValidacion(form, (f) => validarMovimiento(f, esGasto));

  // Identifica la fila original en la planilla por su ID. Van también los
  // datos tal como estaban al cargar (gastos: fecha + hora + monto; ingresos,
  // que no tienen hora: fecha + monto + descripción): el backend los usa para
  // confirmar que el ID sigue en esa fila, y para buscarla si no tiene ID.
  const criterio = {
    ...(movimiento.id ? { id: movimiento.id } : {}),
    ...(esGasto
      ? { fecha: movimiento.fecha, hora: movimiento.hora, monto: movimiento.monto }
      : { fecha: movimiento.fecha, monto: movimiento.monto, descripcion: movimiento.descripcion }),
  };

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
      playDeshacer();
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
        titulo: sinMonto ? `¿Descartar "${nombre}"?` : `¿Descartar "${nombre}" de ${monto}?`,
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
      playBorrar();
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

  // Aviso si la cuenta elegida no es de la moneda del mail (y el monto sigue
  // siendo el del mail): así no se anotan US$4,99 como $4,99.
  const monedaCuenta = cuentas?.find((c) => c.nombre === form.cuenta)?.moneda || "ARS";
  const monedaDistinta =
    sinConfirmar && !sinMonto && monedaMail !== monedaCuenta && parseMonto(form.monto) === Number(movimiento.monto);

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
            <i className={deWhatsApp ? "ph ph-whatsapp-logo" : "ph ph-envelope-simple"} aria-hidden="true" />
            {deWhatsApp
              ? "Lo mandaste por WhatsApp. Elegí la categoría y la cuenta, y confirmalo."
              : sinMonto
              ? `Lo encontramos en un mail de ${movimiento.origenMail}, pero no decía el precio. Poné cuánto gastaste, elegí la categoría y la cuenta, y confirmalo.`
              : `Lo encontramos en un mail de ${movimiento.origenMail}. Revisá el monto, elegí la categoría y la cuenta, y confirmalo.`}
            {sinConfirmar && " Hasta que lo confirmes no se suma a tus gastos ni a tus saldos."}
            {sugerencia?.categoria && ` Elegimos la categoría que usaste la última vez en ${movimiento.descripcion}.`}
          </p>
        )}
        {monedaDistinta && (
          <p className="aviso-inline" role="status">
            <i className="ph ph-currency-circle-dollar" aria-hidden="true" />
            El mail dice {fmtMoney(movimiento.monto, monedaMail)}, pero «{form.cuenta}» está en {monedaCuenta}. Elegí una
            cuenta en {monedaMail} o cambiá el monto a {monedaCuenta}.
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
              // Sin monto arranca vacío: que no marque error apenas se abre.
              onBlur={() => (form.monto || !sinMonto) && v.tocar("monto")}
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
          <MensajeError>{error}</MensajeError>
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

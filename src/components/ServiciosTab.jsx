import { useRef, useState } from "react";
import { crearServicio, desmarcarServicio } from "../api";
import { useAvisos } from "../avisos";
import { aPesos, fmtFecha, fmtMoney, iconoPorCategoria, nombreMes, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { linkCalendario, notificacionesDisponibles, pedirPermisoNotificaciones, permisoNotificaciones } from "../recordatorios";
import { ICONO_ESTADO, iconoServicio, SERVICIOS_TIPICOS, serviciosConEstado, TEXTO_ESTADO, textoVencimiento } from "../servicios";
import { playClick, playError, playSuccess } from "../sounds";
import { validarServicio } from "../validaciones";
import CamposServicio from "./CamposServicio";
import EditarServicioDialog from "./EditarServicioDialog";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";
import PagarServicioDialog from "./PagarServicioDialog";

const VACIO = { nombre: "", diaVencimiento: "", categoria: "", monto: "", cuenta: "" };

export default function ServiciosTab({ servicios, categorias, cuentas, cotizacionUsdArs, monedaPorCuenta, onCambio, onCambioConGasto }) {
  const { avisar } = useAvisos();
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [editando, setEditando] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [desmarcando, setDesmarcando] = useState("");
  const [permiso, setPermiso] = useState(permisoNotificaciones);
  const nombreRef = useRef(null);
  const diaRef = useRef(null);
  const v = useValidacion(form, validarServicio);

  // Atajo: completa el nombre (y la categoría Servicios si existe) y lleva
  // al día de vencimiento, que es lo único que cambia de casa en casa.
  function usarAtajo(nombre) {
    const categoria = (categorias || []).find((c) => c.toLowerCase() === "servicios") || "";
    setForm((f) => ({ ...f, nombre, categoria: f.categoria || categoria }));
    diaRef.current?.focus();
  }

  async function activarAvisos() {
    const r = await pedirPermisoNotificaciones();
    setPermiso(r);
    if (r === "granted") {
      playSuccess();
      avisar("Listo: cuando abras la app te aviso si algo vence");
    }
  }

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function agregar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setErrorForm("");
    try {
      await crearServicio({
        nombre: form.nombre.trim(),
        diaVencimiento: Number(form.diaVencimiento),
        categoria: form.categoria,
        monto: parseMonto(form.monto) || 0,
        cuenta: form.cuenta,
      });
      playSuccess();
      avisar("Servicio agregado");
      setForm(VACIO);
      v.reiniciar();
      onCambio?.();
    } catch (err) {
      playError();
      setErrorForm(err.message || "No se pudo crear el servicio. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function desmarcar(s) {
    const pregunta = s.gastoRegistrado
      ? `¿Volver "${s.nombre}" a pendiente? También se borra el gasto que se cargó al pagarlo.`
      : `¿Volver "${s.nombre}" a pendiente?`;
    if (!window.confirm(pregunta)) return;
    setDesmarcando(s.nombre);
    try {
      const res = await desmarcarServicio(s.nombre);
      playClick();
      if (res?.teniaGasto && !res.gastoBorrado) {
        avisar("Quedó pendiente, pero no encontré el gasto para borrarlo. Fijate en Movimientos.", "error");
      } else {
        avisar(`${s.nombre} volvió a pendiente`);
      }
      (res?.gastoBorrado ? onCambioConGasto : onCambio)?.();
    } catch (err) {
      playError();
      avisar(err.message || "No se pudo desmarcar. Probá de nuevo.", "error");
    } finally {
      setDesmarcando("");
    }
  }

  const lista = serviciosConEstado(servicios.data);
  const yaCargados = new Set(lista.map((s) => s.nombre.toLowerCase()));
  const atajos = SERVICIOS_TIPICOS.filter((t) => !yaCargados.has(t.nombre.toLowerCase()));
  const pendientes = lista.filter((s) => s.estado !== "pagado");
  const pagados = lista.length - pendientes.length;
  const enPesos = (s) => aPesos(s.monto, monedaPorCuenta[s.cuenta], cotizacionUsdArs);
  const faltaCotizacion = pendientes.some((s) => enPesos(s) === null);
  const faltaPagar = pendientes.reduce((sum, s) => sum + (enPesos(s) ?? 0), 0);

  let contenido;
  if (servicios.cargando) {
    contenido = (
      <Cargando texto="Cargando servicios…">
        <div className="grid-cards">
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <Skeleton ancho="60%" />
              <Skeleton ancho="30%" />
              <Skeleton variante="boton" />
            </div>
          ))}
        </div>
      </Cargando>
    );
  } else if (servicios.error && !servicios.data) {
    contenido = (
      <div className="card">
        <ErrorEstado mensaje={servicios.error} onReintentar={servicios.recargar} />
      </div>
    );
  } else if (lista.length === 0) {
    contenido = (
      <div className="card">
        <Vacio icono="ph ph-receipt" texto="Cargá los servicios que pagás todos los meses (luz, agua, internet, teléfono…) y acá ves cuáles ya pagaste y cuáles te faltan. Abajo tenés atajos para no escribir.">
          <button type="button" className="btn btn-secondary" onClick={() => nombreRef.current?.focus()}>
            <i className="ph ph-plus" aria-hidden="true" />
            Agregar servicio
          </button>
        </Vacio>
      </div>
    );
  } else {
    contenido = (
      <>
        <section className="card" aria-labelledby="titulo-servicios-mes">
          <h2 className="card-kicker" id="titulo-servicios-mes">
            Servicios de {nombreMes()}
          </h2>
          <div className="fila-separada">
            <span>
              {pagados} de {lista.length} pagados
            </span>
            <span className="monto-chico">{pendientes.length > 0 ? `Falta ${fmtMoney(faltaPagar)}` : "¡Todo pagado!"}</span>
          </div>
          <div
            className="progreso-pista"
            role="progressbar"
            aria-label="Servicios pagados este mes"
            aria-valuemin={0}
            aria-valuemax={lista.length}
            aria-valuenow={pagados}
            aria-valuetext={`${pagados} de ${lista.length}`}
          >
            <div className="progreso-relleno" style={{ "--pct": `${Math.round((pagados / lista.length) * 100)}%` }} />
          </div>
          {faltaCotizacion && (
            <p className="aviso-inline">
              <i className="ph ph-info" aria-hidden="true" />
              No incluye los servicios en dólares porque no se pudo traer la cotización.
            </p>
          )}
          {permiso === "default" && notificacionesDisponibles() && (
            <button type="button" className="btn btn-secondary" onClick={activarAvisos}>
              <i className="ph ph-bell-ringing" aria-hidden="true" />
              Avisarme cuando algo esté por vencer
            </button>
          )}
          {permiso === "granted" && (
            <p className="aviso-inline">
              <i className="ph ph-bell" aria-hidden="true" />
              Cuando abras la app te aviso si algo vence en los próximos días.
            </p>
          )}
        </section>
        <ul className="lista grid-cards">
          {lista.map((s) => {
            const moneda = monedaPorCuenta[s.cuenta] || "ARS";
            return (
              <li className={`card servicio servicio--${s.estado}`} key={s.nombre}>
                <div className="fila-separada">
                  <span className="fila">
                    <i className={iconoServicio(s.nombre) || iconoPorCategoria(s.categoria)} aria-hidden="true" />
                    <h2 className="card-title">{s.nombre}</h2>
                  </span>
                  <button
                    type="button"
                    className="btn btn-icono"
                    onClick={() => setEditando(s)}
                    aria-label={`Editar ${s.nombre}`}
                  >
                    <i className="ph ph-pencil-simple" aria-hidden="true" />
                  </button>
                </div>
                <span className={`tag tag-estado tag-estado--${s.estado}`}>
                  <i className={ICONO_ESTADO[s.estado]} aria-hidden="true" />
                  {TEXTO_ESTADO[s.estado]}
                </span>
                {s.estado === "pagado" ? (
                  <span className="texto-tenue texto-chico">
                    Pagaste {fmtMoney(s.montoPagado, moneda)} el {fmtFecha(s.fechaPago)}
                    {s.gastoRegistrado ? " · cargado en gastos" : ""}
                  </span>
                ) : (
                  <span className="fila-separada">
                    <span className="monto-chico">{s.monto ? `≈ ${fmtMoney(s.monto, moneda)}` : "Monto a definir"}</span>
                    <span className="texto-tenue texto-chico">
                      {textoVencimiento(s)} ({fmtFecha(s.vencimiento)})
                    </span>
                  </span>
                )}
                {s.estado === "pagado" ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => desmarcar(s)}
                    disabled={desmarcando === s.nombre}
                  >
                    <i className="ph ph-arrow-counter-clockwise" aria-hidden="true" />
                    {desmarcando === s.nombre ? "Desmarcando…" : "Volver a pendiente"}
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={() => setPagando(s)}>
                    <i className="ph ph-check" aria-hidden="true" />
                    Marcar pagado
                  </button>
                )}
                <a className="link texto-chico" href={linkCalendario(s)} target="_blank" rel="noopener noreferrer">
                  <i className="ph ph-calendar-plus" aria-hidden="true" />
                  Recordármelo todos los meses en Google Calendar
                  <span className="visualmente-oculto">(se abre en otra pestaña)</span>
                </a>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      {contenido}

      <form className="card form ancho-form" onSubmit={agregar} noValidate aria-labelledby="titulo-nuevo-servicio">
        <h2 className="card-kicker" id="titulo-nuevo-servicio">
          Nuevo servicio
        </h2>
        {atajos.length > 0 && (
          <div className="field">
            <span className="field-etiqueta" id="titulo-atajos-servicio">
              Atajos
            </span>
            <div className="chips" role="group" aria-labelledby="titulo-atajos-servicio">
              {atajos.map((t) => (
                <button
                  type="button"
                  className="chip"
                  key={t.nombre}
                  aria-pressed={form.nombre === t.nombre}
                  onClick={() => usarAtajo(t.nombre)}
                >
                  <i className={t.icono} aria-hidden="true" />
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
        <CamposServicio form={form} campo={campo} v={v} categorias={categorias} cuentas={cuentas} nombreRef={nombreRef} diaRef={diaRef} />
        {errorForm && (
          <p className="mensaje-error" role="alert">
            {errorForm}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : errorForm ? "Reintentar" : "Agregar"}
        </button>
        <p className="aviso-inline">
          <i className="ph ph-info" aria-hidden="true" />
          Cada mes arrancan todos como pendientes. Lo que se debita solo (Netflix, Spotify) va en Suscripciones.
        </p>
      </form>

      {editando && (
        <EditarServicioDialog
          servicio={editando}
          categorias={categorias}
          cuentas={cuentas}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}

      {pagando && (
        <PagarServicioDialog
          servicio={pagando}
          cuentas={cuentas}
          monedaPorCuenta={monedaPorCuenta}
          onClose={() => setPagando(null)}
          onGuardado={(conGasto) => (conGasto ? onCambioConGasto : onCambio)?.()}
        />
      )}
    </>
  );
}

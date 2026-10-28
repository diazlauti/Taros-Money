import { useRef, useState } from "react";
import { crearSuscripcion } from "../api";
import { useAvisos } from "../avisos";
import { aPesos, fmtMoney, fmtFecha, iconoPorCategoria, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { validarSuscripcion } from "../validaciones";
import CamposSuscripcion from "./CamposSuscripcion";
import EditarSuscripcionDialog from "./EditarSuscripcionDialog";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";
import MensajeError from "./MensajeError";

const VACIO = { nombre: "", diaCobro: "", categoria: "", monto: "", cuenta: "" };

export default function RecurrentesTab({ suscripciones, categorias, cuentas, cotizaciones, monedaPorCuenta, onCambio }) {
  const { avisar } = useAvisos();
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [editando, setEditando] = useState(null);
  const nombreRef = useRef(null);
  const v = useValidacion(form, validarSuscripcion);

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function agregar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setErrorForm("");
    try {
      await crearSuscripcion({
        nombre: form.nombre.trim(),
        diaCobro: Number(form.diaCobro),
        categoria: form.categoria,
        monto: parseMonto(form.monto),
        cuenta: form.cuenta,
      });
      playSuccess();
      avisar("Suscripción agregada");
      setForm(VACIO);
      v.reiniciar();
      onCambio?.();
    } catch (err) {
      playError();
      setErrorForm(err.message || "No se pudo crear la suscripción. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const lista = suscripciones.data || [];
  // Cada suscripción se debita de una cuenta con su propia moneda; las de
  // otras monedas se pasan a pesos con la cotización. Si no hay cotización se avisa
  // en vez de sumarlas como 0 sin decir nada.
  const faltaCotizacion = lista.some((s) => aPesos(s.monto, monedaPorCuenta[s.cuenta], cotizaciones) === null);
  const total = lista.reduce((sum, s) => sum + (aPesos(s.monto, monedaPorCuenta[s.cuenta], cotizaciones) ?? 0), 0);

  let contenido;
  if (suscripciones.cargando) {
    contenido = (
      <Cargando texto="Cargando suscripciones…">
        <div className="grid-cards">
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <Skeleton ancho="60%" />
              <Skeleton ancho="30%" />
              <Skeleton variante="monto-medio" />
            </div>
          ))}
        </div>
      </Cargando>
    );
  } else if (suscripciones.error && !suscripciones.data) {
    contenido = (
      <div className="card">
        <ErrorEstado mensaje={suscripciones.error} onReintentar={suscripciones.recargar} />
      </div>
    );
  } else if (lista.length === 0) {
    contenido = (
      <div className="card">
        <Vacio icono="ph ph-repeat" texto="Todavía no cargaste suscripciones. Agregá la primera (Netflix, Spotify, el gimnasio…).">
          <button type="button" className="btn btn-secondary" onClick={() => nombreRef.current?.focus()}>
            <i className="ph ph-plus" aria-hidden="true" />
            Agregar suscripción
          </button>
        </Vacio>
      </div>
    );
  } else {
    contenido = (
      <>
        <section className="card" aria-labelledby="titulo-total-recurrente">
          <div className="fila-separada">
            <h2 className="card-kicker" id="titulo-total-recurrente">
              Total por mes
            </h2>
            <span className="monto-chico">{fmtMoney(total)}</span>
          </div>
          {faltaCotizacion && (
            <p className="aviso-inline">
              <i className="ph ph-info" aria-hidden="true" />
              No incluye las suscripciones en otras monedas porque falta su cotización (fijala en Configuración › Monedas).
            </p>
          )}
        </section>
        <ul className="lista grid-cards">
          {lista.map((s, i) => (
            <li key={`${s.nombre}-${i}`}>
              <button type="button" className="card card-tocable" onClick={() => setEditando(s)}>
                <span className="fila-separada">
                  <span className="fila">
                    <i className={iconoPorCategoria(s.categoria)} aria-hidden="true" />
                    <span className="card-title">{s.nombre}</span>
                  </span>
                  <i className="ph ph-pencil-simple texto-tenue" aria-hidden="true" />
                </span>
                {s.categoria && <span className="tag">{s.categoria}</span>}
                {s.cuenta && <span className="texto-tenue texto-chico">{s.cuenta}</span>}
                <span className="fila-separada">
                  <span className="monto-chico">{fmtMoney(s.monto, monedaPorCuenta[s.cuenta] || "ARS")}/mes</span>
                  <span className="texto-tenue texto-chico">Próximo cobro: {fmtFecha(s.proximaFecha)}</span>
                </span>
                <span className="visualmente-oculto">Tocá para editar o borrar</span>
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      {contenido}

      <form className="card form ancho-form" onSubmit={agregar} noValidate aria-labelledby="titulo-nueva-suscripcion">
        <h2 className="card-kicker" id="titulo-nueva-suscripcion">
          Nueva suscripción
        </h2>
        <CamposSuscripcion form={form} campo={campo} v={v} categorias={categorias} cuentas={cuentas} nombreRef={nombreRef} />
        {errorForm && (
          <MensajeError>{errorForm}</MensajeError>
        )}
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : errorForm ? "Reintentar" : "Agregar"}
        </button>
      </form>

      {editando && (
        <EditarSuscripcionDialog
          suscripcion={editando}
          categorias={categorias}
          cuentas={cuentas}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}
    </>
  );
}

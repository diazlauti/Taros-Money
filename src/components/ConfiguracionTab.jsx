import { useState } from "react";
import { useAvisos } from "../avisos";
import { estaInstalada } from "../instalacion";
import { playClick, playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import AjustesMails from "./AjustesMails";
import Campo from "./Campo";
import MonedasCard from "./MonedasCard";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

const OPCIONES_TEMA = [
  ["auto", "Automático"],
  ["light", "Claro"],
  ["dark", "Oscuro"],
];

const OPCIONES_MAILS = [
  ["apagado", "Apagado", "No se lee ningún mail."],
  ["al_abrir", "Al abrir la app", "Cada vez que entrás, se fija si hay compras nuevas."],
  ["boton", "Con un botón", "Solo cuando tocás \"Revisar mails\" en Movimientos."],
  ["siempre", "Siempre", "Se revisa sola cada media hora, aunque no abras la app."],
];

export default function ConfiguracionTab({
  urlPlanilla,
  monedas,
  cotizacionesHoy,
  cuentas,
  onMonedasGuardadas,
  configMails,
  onCambiarModoMails,
  revisandoMails,
  onRevisarMails,
  categorias,
  onAgregarCategoria,
  onBorrarCategoria,
  tema,
  onCambiarTema,
  sonido,
  onToggleSonido,
  onCerrarSesion,
  onVerTour,
  onInstalar,
}) {
  const { avisar } = useAvisos();
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [tocado, setTocado] = useState(false);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [borrandoCategoria, setBorrandoCategoria] = useState(null);
  const [errorCategoria, setErrorCategoria] = useState("");
  const lista = categorias.data || [];
  const errorNombre = errorNombreNuevo(nuevaCategoria, lista, "categoría");
  const errorVisible = tocado || nuevaCategoria ? errorNombre : "";

  async function agregar(e) {
    e.preventDefault();
    setTocado(true);
    if (errorNombre) return;
    const nombre = nuevaCategoria.trim();
    setGuardandoCategoria(true);
    setErrorCategoria("");
    try {
      await onAgregarCategoria(nombre);
      playSuccess();
      avisar(`Categoría "${nombre}" agregada`);
      setNuevaCategoria("");
      setTocado(false);
    } catch (err) {
      playError();
      setErrorCategoria(err.message || "No se pudo agregar la categoría. Probá de nuevo.");
    } finally {
      setGuardandoCategoria(false);
    }
  }

  async function borrar(nombre) {
    if (!window.confirm(`¿Borrar la categoría "${nombre}"? Los movimientos que ya la usan no cambian.`)) return;
    setBorrandoCategoria(nombre);
    setErrorCategoria("");
    try {
      await onBorrarCategoria(nombre);
      playClick();
      avisar(`Categoría "${nombre}" borrada`);
    } catch (err) {
      playError();
      setErrorCategoria(err.message || "No se pudo borrar la categoría. Probá de nuevo.");
    } finally {
      setBorrandoCategoria(null);
    }
  }

  let planilla;
  if (urlPlanilla.cargando) {
    planilla = (
      <Cargando texto="Buscando el link de tu planilla…">
        <Skeleton ancho="40%" />
      </Cargando>
    );
  } else if (urlPlanilla.error || !urlPlanilla.data) {
    planilla = (
      <ErrorEstado
        mensaje={urlPlanilla.error || "No se encontró el link de tu planilla."}
        onReintentar={urlPlanilla.recargar}
      />
    );
  } else {
    planilla = (
      <a className="link" href={urlPlanilla.data} target="_blank" rel="noreferrer">
        <i className="ph ph-table" aria-hidden="true" />
        Abrir mi planilla
        <span className="visualmente-oculto">(se abre en otra pestaña)</span>
        <i className="ph ph-arrow-square-out" aria-hidden="true" />
      </a>
    );
  }

  const [guardandoMails, setGuardandoMails] = useState(false);
  const [errorMails, setErrorMails] = useState("");

  // Se llama directo desde el click: la primera vez abre la ventana de
  // Google para dar permiso de leer el Gmail.
  async function cambiarModoMails(modo) {
    setGuardandoMails(true);
    setErrorMails("");
    try {
      await onCambiarModoMails(modo);
      playSuccess();
      if (modo === "apagado") avisar("Listo, ya no se revisan tus mails");
    } catch (err) {
      playError();
      setErrorMails(err.message || "No se pudo cambiar. Probá de nuevo.");
    } finally {
      setGuardandoMails(false);
    }
  }

  let mails = null;
  if (configMails) {
    const modoMails = configMails.data?.modo || "apagado";
    if (configMails.cargando) {
      mails = (
        <Cargando texto="Cargando cómo se revisan tus mails…">
          <Skeleton ancho="60%" />
        </Cargando>
      );
    } else if (configMails.error && !configMails.data) {
      mails = <ErrorEstado mensaje={configMails.error} onReintentar={configMails.recargar} />;
    } else {
      mails = (
        <>
          <fieldset className="field" disabled={guardandoMails}>
            <legend>Cuándo revisarlos</legend>
            <div className="seg seg-vertical">
              {OPCIONES_MAILS.map(([valor, texto, ayuda]) => (
                <label className="seg-opt" key={valor}>
                  <input
                    type="radio"
                    name="modo-mails"
                    checked={modoMails === valor}
                    onChange={() => cambiarModoMails(valor)}
                  />
                  <span className="seg-opt-texto">
                    {texto}
                    <span className="seg-opt-ayuda">{ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="field-ayuda" aria-live="polite">
              {guardandoMails ? "Guardando…" : ""}
            </p>
          </fieldset>
          {modoMails !== "apagado" && (
            <button
              type="button"
              className="btn btn-secondary btn-alinear-inicio"
              onClick={onRevisarMails}
              disabled={revisandoMails || guardandoMails}
            >
              <i className="ph ph-envelope-simple" aria-hidden="true" />
              {revisandoMails ? "Revisando mails…" : "Revisar mails ahora"}
            </button>
          )}
          {errorMails && (
            <p className="mensaje-error" role="alert">
              {errorMails}
            </p>
          )}
          {modoMails !== "apagado" && <AjustesMails modo={modoMails} />}
        </>
      );
    }
  }

  let chips;
  if (categorias.cargando) {
    chips = (
      <Cargando texto="Cargando categorías…">
        <div className="fila">
          <Skeleton ancho="25%" />
          <Skeleton ancho="20%" />
          <Skeleton ancho="30%" />
        </div>
      </Cargando>
    );
  } else if (categorias.error && !categorias.data) {
    chips = <ErrorEstado mensaje={categorias.error} onReintentar={categorias.recargar} />;
  } else if (lista.length === 0) {
    chips = <p className="mensaje-estado">Todavía no agregaste ninguna. Escribí la primera acá abajo.</p>;
  } else {
    chips = (
      <ul className="lista chips">
        {lista.map((c) => (
          <li key={c} className="tag tag-borrable">
            {c}
            <button
              type="button"
              className="btn btn-icono"
              onClick={() => borrar(c)}
              disabled={borrandoCategoria === c}
              aria-label={`Borrar categoría ${c}`}
            >
              <i className="ph ph-x" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="pila ancho-contenido">
      <section className="card" aria-labelledby="titulo-planilla">
        <h2 className="card-kicker" id="titulo-planilla">
          Tu planilla
        </h2>
        <p className="texto-intro">
          Todos tus datos (gastos, ingresos, cuentas, metas, suscripciones) viven en tu propia planilla de Google
          Sheets. Podés abrirla para revisar algo o corregirlo a mano.
        </p>
        {planilla}
      </section>

      {mails && (
        <section className="card" aria-labelledby="titulo-mails">
          <h2 className="card-kicker" id="titulo-mails">
            Gastos desde tus mails
          </h2>
          <p className="texto-intro">
            Buscamos en tu Gmail los mails de compras, pagos y transferencias (Mercado Pago y los bancos que elijas) y
            los cargamos solos en Movimientos con la etiqueta "A revisar", para que confirmes o corrijas cada uno. La
            primera vez Google te va a pedir permiso para leer tus mails. Solo se leen, nunca se borran ni se mandan.
          </p>
          {mails}
        </section>
      )}

      <MonedasCard monedas={monedas} cotizacionesHoy={cotizacionesHoy} cuentas={cuentas} onGuardadas={onMonedasGuardadas} />

      <section className="card" aria-labelledby="titulo-categorias-config">
        <h2 className="card-kicker" id="titulo-categorias-config">
          Categorías
        </h2>
        <p className="texto-intro">Aparecen para elegir al cargar un gasto, ingreso o suscripción.</p>
        {chips}

        <form className="form-buscar" onSubmit={agregar} noValidate>
          <Campo etiqueta="Nueva categoría" error={errorVisible}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                placeholder="Ej: Mascotas"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onBlur={() => nuevaCategoria && setTocado(true)}
              />
            )}
          </Campo>
          <button className="btn btn-secondary" type="submit" disabled={guardandoCategoria}>
            {guardandoCategoria ? "Agregando…" : "Agregar"}
          </button>
        </form>
        {errorCategoria && (
          <p className="mensaje-error" role="alert">
            {errorCategoria}
          </p>
        )}
      </section>

      <section className="card" aria-labelledby="titulo-apariencia">
        <h2 className="card-kicker" id="titulo-apariencia">
          Apariencia y sonido
        </h2>
        <fieldset className="field">
          <legend>Tema</legend>
          <div className="seg">
            {OPCIONES_TEMA.map(([valor, texto]) => (
              <label className="seg-opt" key={valor}>
                <input type="radio" name="tema" checked={tema === valor} onChange={() => onCambiarTema(valor)} />
                {texto}
              </label>
            ))}
          </div>
          <p className="field-ayuda">Automático usa el mismo modo que tu celular o compu.</p>
        </fieldset>
        <button
          type="button"
          className="btn btn-secondary btn-alinear-inicio"
          aria-pressed={sonido}
          onClick={onToggleSonido}
        >
          <i className={sonido ? "ph ph-speaker-high" : "ph ph-speaker-slash"} aria-hidden="true" />
          {sonido ? "Sonidos activados" : "Sonidos apagados"}
        </button>
      </section>

      <section className="card" aria-labelledby="titulo-ayuda">
        <h2 className="card-kicker" id="titulo-ayuda">
          Ayuda
        </h2>
        <div className="pila-chica">
          <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={onVerTour}>
            <i className="ph ph-signpost" aria-hidden="true" />
            Ver el recorrido de nuevo
          </button>
          {estaInstalada() ? (
            <p className="mensaje-estado">
              <i className="ph ph-check-circle" aria-hidden="true" /> Ya la tenés en tu pantalla de inicio.
            </p>
          ) : (
            <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={onInstalar}>
              <i className="ph ph-device-mobile" aria-hidden="true" />
              Agregar a la pantalla de inicio
            </button>
          )}
        </div>
      </section>

      <section className="card" aria-labelledby="titulo-cuenta">
        <h2 className="card-kicker" id="titulo-cuenta">
          Tu sesión
        </h2>
        <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={onCerrarSesion}>
          <i className="ph ph-sign-out" aria-hidden="true" />
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}

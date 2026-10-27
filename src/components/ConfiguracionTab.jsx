import { useState } from "react";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { estaInstalada } from "../instalacion";
import { buscarActualizacion, NUMERO_VERSION } from "../actualizacion";
import { playClick, playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import { iconoDeCategoria } from "../iconos";
import ModoMails from "./ModoMails";
import RevisionMails from "./RevisionMails";
import Campo from "./Campo";
import EditarCategoriaDialog from "./EditarCategoriaDialog";
import MonedasCard from "./MonedasCard";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

const OPCIONES_TEMA = [
  ["auto", "Automático"],
  ["light", "Claro"],
  ["dark", "Oscuro"],
];

export default function ConfiguracionTab({
  urlPlanilla,
  monedas,
  cotizacionesHoy,
  cuentas,
  onMonedasGuardadas,
  configMails,
  onCambiarModoMails,
  revisionMails,
  revisandoMails,
  onRevisarMails,
  diasMails,
  onCambiarDiasMails,
  categorias,
  onAgregarCategoria,
  onBorrarCategoria,
  onEditarCategoria,
  iconosSoloEsteDispositivo,
  tema,
  onCambiarTema,
  sonido,
  onToggleSonido,
  onCerrarSesion,
  onVerTour,
  onInstalar,
}) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [tocado, setTocado] = useState(false);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [borrandoCategoria, setBorrandoCategoria] = useState(null);
  const [errorCategoria, setErrorCategoria] = useState("");
  const [categoriaIcono, setCategoriaIcono] = useState(null);
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
    if (!(await confirmar({ titulo: `¿Borrar la categoría "${nombre}"?`, texto: "Los movimientos que ya la usan no cambian.", si: "Borrar", peligro: true }))) return;
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
      mails =
        modoMails === "apagado" ? (
          <ModoMails modo={modoMails} onCambiar={onCambiarModoMails} />
        ) : (
          <RevisionMails
            revision={revisionMails}
            revisando={revisandoMails}
            dias={diasMails}
            modo={modoMails}
            onCambiarModo={onCambiarModoMails}
            onCambiarDias={onCambiarDiasMails}
            onRevisar={onRevisarMails}
          />
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
          <li key={c} className="tag tag-borrable tag-con-icono">
            <button
              type="button"
              className="tag-editar"
              onClick={() => setCategoriaIcono(c)}
              aria-label={`Editar ${c}`}
              aria-haspopup="dialog"
            >
              <i className={iconoDeCategoria(c)} aria-hidden="true" />
              {c}
            </button>
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
    <div className="pila ancho-contenido config-columnas">
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
          {configMails.data?.modo === "apagado" && (
            <p className="texto-intro">
              Cargo solos los gastos de los mails de tus compras y pagos; vos solo confirmás. Solo leo, nunca borro ni
              mando nada.
            </p>
          )}
          {mails}
        </section>
      )}

      <MonedasCard monedas={monedas} cotizacionesHoy={cotizacionesHoy} cuentas={cuentas} onGuardadas={onMonedasGuardadas} />

      <section className="card" aria-labelledby="titulo-categorias-config">
        <h2 className="card-kicker" id="titulo-categorias-config">
          Categorías
        </h2>
        <p className="texto-intro">
          Aparecen para elegir al cargar un gasto, ingreso o suscripción. Tocá una para cambiarle el nombre o el ícono.
        </p>
        {chips}
        {iconosSoloEsteDispositivo && lista.length > 0 && (
          <p className="texto-chico texto-tenue">
            <i className="ph ph-info" aria-hidden="true" /> Por ahora los íconos que elegís se guardan solo en este
            dispositivo.
          </p>
        )}
        {categoriaIcono && (
          <EditarCategoriaDialog
            categoria={categoriaIcono}
            otras={lista.filter((c) => c !== categoriaIcono)}
            onGuardar={onEditarCategoria}
            onClose={() => setCategoriaIcono(null)}
          />
        )}

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
          <p className="field-ayuda">
            Atajo: con la app instalada, mantené apretado su ícono para cargar un gasto o un ingreso directo (en
            Android y en la compu).
          </p>
          <BuscarActualizacion />
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

// Solo se avisa si no se pudo fijar: si hay versión nueva ya aparece el
// cartel de arriba, y si no hay, no hace falta decir nada.
const SIN_CONEXION = "No pude fijarme: parece que no hay conexión.";

// La app se actualiza sola, pero en el iPhone instalada no hay botón de
// recargar: con esto se puede pedir que se fije ya.
function BuscarActualizacion() {
  const [estado, setEstado] = useState("");

  async function buscar() {
    setEstado("buscando");
    playClick();
    const resultado = await buscarActualizacion();
    setEstado(resultado);
    if (resultado === "sin-conexion") playError();
  }

  return (
    <div className="pila-chica">
      <button
        type="button"
        className="btn btn-secondary btn-alinear-inicio"
        disabled={estado === "buscando"}
        onClick={buscar}
      >
        <i className="ph ph-arrows-clockwise" aria-hidden="true" />
        {estado === "buscando" ? "Buscando…" : "Buscar actualización"}
      </button>
      {NUMERO_VERSION && <p className="field-ayuda">Versión {NUMERO_VERSION}</p>}
      <p className="field-ayuda" aria-live="polite">
        {estado === "sin-conexion" ? SIN_CONEXION : ""}
      </p>
    </div>
  );
}

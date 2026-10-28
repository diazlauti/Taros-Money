import { useEffect, useState } from "react";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { estaInstalada } from "../instalacion";
import { actualizarAhora, buscarActualizacion, NUMERO_VERSION } from "../actualizacion";
import { playClick, playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import { iconoDeCategoria } from "../iconos";
import ModoMails from "./ModoMails";
import RevisionMails from "./RevisionMails";
import Campo from "./Campo";
import Explicacion from "./Explicacion";
import EditarCategoriaDialog from "./EditarCategoriaDialog";
import MonedasCard from "./MonedasCard";
import AvisosPushCard from "./AvisosPushCard";
import SugerenciaDialog from "./SugerenciaDialog";
import { pushConfigurado } from "../push";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";
import MensajeError from "./MensajeError";

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
  pendientesMails,
  cargandoPendientesMails,
  monedaPorCuenta,
  onCambioMovimientos,
  onVerPendientesMails,
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
  abrirGrupo,
  onGrupoAbierto,
}) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [tocado, setTocado] = useState(false);
  const [sugerenciaAbierta, setSugerenciaAbierta] = useState(false);
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [borrandoCategoria, setBorrandoCategoria] = useState(null);
  const [errorCategoria, setErrorCategoria] = useState("");
  const [categoriaIcono, setCategoriaIcono] = useState(null);
  const lista = categorias.data || [];

  // Si se llegó desde otra sección (ej: «Activar» en la tarjeta de mails del
  // Resumen), se abre directo el grupo que corresponde.
  useEffect(() => {
    if (!abrirGrupo) return;
    const grupo = document.getElementById(`config-${abrirGrupo}`);
    if (grupo) grupo.open = true;
    onGrupoAbierto?.();
  }, [abrirGrupo, onGrupoAbierto]);
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
      <ul className="opciones">
        <li>
          <a className="opcion" href={urlPlanilla.data} target="_blank" rel="noreferrer">
            <i className="ph ph-table opcion-icono" aria-hidden="true" />
            <span className="opcion-texto">Abrir mi planilla</span>
            <span className="visualmente-oculto">(se abre en otra pestaña)</span>
            <i className="ph ph-arrow-square-out opcion-flecha" aria-hidden="true" />
          </a>
        </li>
      </ul>
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
            pendientes={pendientesMails}
            cargandoPendientes={cargandoPendientesMails}
            categorias={categorias.data}
            cuentas={cuentas}
            monedaPorCuenta={monedaPorCuenta}
            onVerTodos={onVerPendientesMails}
            onCambio={onCambioMovimientos}
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

  const cantidadPendientes = configMails && configMails.data?.modo !== "apagado" ? (pendientesMails || []).length : 0;

  return (
    <div className="pila config-grupos">
      <div className="ajustes-lista">
        <GrupoConfig
          id="gastos"
          icono="ph ph-receipt"
          titulo="Gastos"
          aviso={cantidadPendientes > 0 ? `${cantidadPendientes} para revisar` : ""}
        >
          <section className="card" aria-labelledby="titulo-categorias-config">
            <h2 className="card-kicker titulo-con-info" id="titulo-categorias-config">
              Categorías
              <Explicacion
                texto="Aparecen para elegir al cargar un gasto, ingreso o suscripción. Tocá una para cambiarle el nombre o el ícono."
                etiqueta="Más info sobre las categorías"
              />
            </h2>
            {chips}
            {iconosSoloEsteDispositivo && lista.length > 0 && (
              <p className="aviso-inline">
                <i className="ph ph-info" aria-hidden="true" />
                Por ahora los íconos que elegís se guardan solo en este dispositivo.
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
            {errorCategoria && <MensajeError>{errorCategoria}</MensajeError>}
          </section>

          {mails && (
            <section className="card" aria-labelledby="titulo-mails">
              <h2 className="card-kicker titulo-con-info" id="titulo-mails">
                Gastos desde tus mails
                <Explicacion
                  texto="Cargo solos los gastos de los mails de tus compras y pagos; vos solo confirmás. Solo leo, nunca borro ni mando nada."
                  etiqueta="Más info sobre los gastos desde tus mails"
                />
              </h2>
              {mails}
            </section>
          )}

          <section className="card" aria-labelledby="titulo-planilla">
            <h2 className="card-kicker titulo-con-info" id="titulo-planilla">
              Tu planilla
              <Explicacion
                texto="Todos tus datos (gastos, ingresos, cuentas, metas, suscripciones) viven en tu propia planilla de Google Sheets. Podés abrirla para revisar algo o corregirlo a mano."
                etiqueta="Más info sobre tu planilla"
              />
            </h2>
            {planilla}
          </section>
        </GrupoConfig>

        <GrupoConfig
          id="monedas"
          icono="ph ph-currency-dollar"
          titulo="Monedas"
         
          solo
        >
          <MonedasCard
            monedas={monedas}
            cotizacionesHoy={cotizacionesHoy}
            cuentas={cuentas}
            onGuardadas={onMonedasGuardadas}
          />
        </GrupoConfig>

        {pushConfigurado() && (
          <GrupoConfig
            id="avisos"
            icono="ph ph-bell"
            titulo="Avisos"
           
            solo
          >
            <AvisosPushCard onInstalar={onInstalar} />
          </GrupoConfig>
        )}

        <GrupoConfig
          id="visual"
          icono="ph ph-palette"
          titulo="Visual y sonido"
         
          solo
        >
          <section className="card" aria-labelledby="titulo-apariencia">
            <h2 className="card-kicker" id="titulo-apariencia">
              Apariencia y sonido
            </h2>
            <ul className="opciones">
              <li className="opcion opcion--columna">
                <fieldset className="field opcion-campo">
                  <legend className="titulo-con-info">
                    <i className="ph ph-circle-half opcion-icono" aria-hidden="true" />
                    Tema
                    <Explicacion
                      texto="«Automático» usa el mismo modo que tu celular o compu."
                      etiqueta="Más info sobre el tema"
                    />
                  </legend>
                  <div className="seg seg-ancho">
                    {OPCIONES_TEMA.map(([valor, texto]) => (
                      <label className="seg-opt" key={valor}>
                        <input
                          type="radio"
                          name="tema"
                          checked={tema === valor}
                          onChange={() => onCambiarTema(valor)}
                        />
                        {texto}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
              <li>
                <button type="button" role="switch" aria-checked={sonido} className="opcion" onClick={onToggleSonido}>
                  <i
                    className={`${sonido ? "ph ph-speaker-high" : "ph ph-speaker-slash"} opcion-icono`}
                    aria-hidden="true"
                  />
                  <span className="opcion-texto">Sonidos</span>
                  <span className="interruptor" aria-hidden="true" />
                </button>
              </li>
            </ul>
          </section>
        </GrupoConfig>

        <GrupoConfig
          id="ayuda"
          icono="ph ph-lifebuoy"
          titulo="Ayuda"
         
          solo
        >
          <section className="card" aria-labelledby="titulo-ayuda">
            <h2 className="card-kicker" id="titulo-ayuda">
              Ayuda
            </h2>
            <ul className="opciones">
              <li>
                <button type="button" className="opcion" onClick={onVerTour}>
                  <i className="ph ph-signpost opcion-icono" aria-hidden="true" />
                  <span className="opcion-texto">Ver el recorrido de nuevo</span>
                  <i className="ph ph-caret-right opcion-flecha" aria-hidden="true" />
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="opcion"
                  onClick={() => {
                    playClick();
                    setSugerenciaAbierta(true);
                  }}
                >
                  <i className="ph ph-chat-circle-text opcion-icono" aria-hidden="true" />
                  <span className="opcion-texto">Mandar una sugerencia o error</span>
                  <i className="ph ph-caret-right opcion-flecha" aria-hidden="true" />
                </button>
              </li>
              <li className="opcion-con-info">
                {estaInstalada() ? (
                  <p className="opcion">
                    <i className="ph ph-check-circle opcion-icono" aria-hidden="true" />
                    <span className="opcion-texto">Ya la tenés en tu pantalla de inicio</span>
                  </p>
                ) : (
                  <button type="button" className="opcion" onClick={onInstalar}>
                    <i className="ph ph-device-mobile opcion-icono" aria-hidden="true" />
                    <span className="opcion-texto">Agregar a la pantalla de inicio</span>
                    <i className="ph ph-caret-right opcion-flecha" aria-hidden="true" />
                  </button>
                )}
                <Explicacion
                  texto="Atajo: con la app instalada, mantené apretado su ícono para cargar un gasto o un ingreso directo (en Android y en la compu)."
                  etiqueta="Atajo del ícono"
                />
              </li>
              <li>
                <BuscarActualizacion />
              </li>
            </ul>
          </section>
        </GrupoConfig>
      </div>

      {sugerenciaAbierta && <SugerenciaDialog onClose={() => setSugerenciaAbierta(false)} />}

      <ul className="opciones">
        <li>
          <button type="button" className="opcion opcion--peligro" onClick={onCerrarSesion}>
            <i className="ph ph-sign-out opcion-icono" aria-hidden="true" />
            <span className="opcion-texto">Cerrar sesión</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

// Cada grupo es un desplegable (details/summary: ya es un botón con
// «expandido/contraído» para lectores de pantalla y anda con teclado).
// Todos comparten name="config": al abrir uno se cierra el que estaba
// abierto, así nunca hay todo desplegado a la vez. Si es una sola sección,
// su título queda solo para lectores de pantalla (el grupo ya lo dice).
function GrupoConfig({ id, icono, titulo, aviso, solo = false, children }) {
  return (
    <details className={`card config-grupo${solo ? " config-grupo--solo" : ""}`} id={`config-${id}`} name="config">
      <summary className="config-grupo-cabeza" onClick={() => playClick()}>
        <span className="config-grupo-icono" aria-hidden="true">
          <i className={icono} />
        </span>
        <span className="config-grupo-textos">
          <span className="config-grupo-titulo">{titulo}</span>
          {aviso && <span className="config-grupo-aviso">{aviso}</span>}
        </span>
        <i className="ph ph-caret-down config-grupo-flecha" aria-hidden="true" />
      </summary>
      <div className="config-grupo-cuerpo">{children}</div>
    </details>
  );
}

// El resultado sale en un aviso corto de abajo, que se va solo (lauti
// quiere poco texto fijo en Ayuda, pero sí enterarse de qué pasó).
const SIN_CONEXION = "No pude fijarme: parece que no hay conexión.";

// La app se actualiza sola, pero en el iPhone instalada no hay botón de
// recargar: con esto se puede pedir que se fije ya.
function BuscarActualizacion() {
  const { avisar } = useAvisos();
  const [estado, setEstado] = useState("");

  async function buscar() {
    setEstado("buscando");
    playClick();
    const resultado = await buscarActualizacion();
    setEstado(resultado);
    if (resultado === "sin-conexion") {
      playError();
      avisar(SIN_CONEXION, "error");
    } else if (resultado === "nueva") {
      playSuccess();
      avisar("Hay una versión nueva", "exito", { accion: "Actualizar", onAccion: actualizarAhora });
    } else {
      avisar("Ya tenés la última versión", "exito");
    }
  }

  return (
    <button type="button" className="opcion" disabled={estado === "buscando"} onClick={buscar}>
      <i className="ph ph-arrows-clockwise opcion-icono" aria-hidden="true" />
      <span className="opcion-texto">{estado === "buscando" ? "Buscando…" : "Buscar actualización"}</span>
      {NUMERO_VERSION && <span className="opcion-dato">Versión {NUMERO_VERSION}</span>}
    </button>
  );
}

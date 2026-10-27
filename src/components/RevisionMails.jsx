import { useEffect, useId, useRef, useState } from "react";
import { getAjustesMails } from "../api";
import { hayTokenMailsVigente } from "../auth";
import { nombresDeRemitentes } from "../bancosMails";
import { fmtFecha, fmtMoney, haceCuanto } from "../format";
import { DIAS_REVISION_MAILS, OPCIONES_DIAS_MAILS, avisosRevisionMails, estadoBandeja } from "../revisionMails";
import AjustesMails from "./AjustesMails";
import Dialog from "./Dialog";
import EditarMovimientoDialog from "./EditarMovimientoDialog";
import { SkeletonFilas } from "./Estado";
import ModoMails from "./ModoMails";

// La revisión de mails como una bandeja: arriba qué falta revisar (o que
// estás al día), la lista de lo pendiente para abrirlo con un toque, una
// barra mientras busca y el botón. La explicación está en el botón «i» y los
// consejos salen en un pop-up cuando no encuentra nada.
// Se usa en el Resumen y en Configuración.

// La revisión es un solo pedido a Google, que no avisa cuánto falta: la
// barra avanza con lo que suele tardar cada parte y se completa al terminar.
// Los bancos que agregó la persona salen por nombre y resaltados.
const SEGUNDOS_POR_PASO = 3.5;

// Mercado Pago y Steam ya tienen su paso: si la persona los agregó como
// remitentes, no se repiten.
const YA_TIENEN_PASO = /^(mercado ?pago|steam|steampowered)$/i;

function armarPasos(bancosTodos) {
  const bancos = bancosTodos.filter((b) => !YA_TIENEN_PASO.test(b));
  return [
    { texto: "Conectando con tu Gmail…" },
    { texto: "Buscando en", nombre: "Mercado Pago" },
    { texto: "Buscando en", nombre: "Steam" },
    ...(bancos.length > 0
      ? bancos.map((b) => ({ texto: "Buscando en", nombre: b, propio: true }))
      : [{ texto: "Buscando en los mails de bancos…" }]),
    { texto: "Buscando transferencias…" },
    { texto: "Buscando otros comprobantes de pago…" },
    { texto: "Anotando lo que encontré…" },
  ];
}

// Nombres de los bancos de la persona: se piden una vez por sesión.
let bancosCache = null;

// Los consejos salen solos la primera vez que no encuentra nada y después
// cada tantas revisiones vacías seguidas (no siempre, que cansa). La cuenta
// se guarda en este dispositivo.
const VACIAS_PARA_CONSEJOS = 5;
const VACIAS_KEY = "taros-mails-vacias";
// Cuánto se ve la barra llena antes del resultado.
const MS_BARRA_LLENA = 900;

function contarVacia() {
  try {
    const n = (Number(localStorage.getItem(VACIAS_KEY)) || 0) + 1;
    localStorage.setItem(VACIAS_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

function reiniciarVacias() {
  try {
    localStorage.setItem(VACIAS_KEY, "0");
  } catch {
    /* sin storage: los consejos salen la primera vez de cada sesión */
  }
}

function desdeFecha(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function Progreso({ bancos, completo }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setSegundos((Date.now() - inicio) / 1000), 250);
    return () => clearInterval(id);
  }, []);
  // Llega rápido a la mitad y después se frena; nunca pasa de 95% sola.
  // Al terminar se llena hasta el 100% antes de mostrar el resultado.
  const pct = completo ? 100 : Math.round(95 * (1 - Math.exp(-segundos / 12)));
  const pasos = armarPasos(bancos);
  const indice = completo ? pasos.length : Math.min(Math.floor(segundos / SEGUNDOS_POR_PASO), pasos.length - 1);
  const paso = completo ? { texto: "¡Listo!" } : pasos[indice];
  return (
    <div className="revision-progreso" role="status" aria-live="polite">
      <div className="revision-progreso-cabeza">
        <span className="revision-paso" key={indice}>
          {paso.texto}
          {paso.nombre && (
            <>
              {" "}
              <span className={paso.propio ? "revision-banco revision-banco--propio" : "revision-banco"}>
                {paso.nombre}
              </span>
              …
            </>
          )}
        </span>
        <span className="texto-tenue">{pct}%</span>
      </div>
      <div
        className="revision-barra"
        role="progressbar"
        aria-label="Progreso de la revisión de mails"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span className="revision-barra-relleno" style={{ "--pct": `${pct}%` }} />
      </div>
    </div>
  );
}

// Cuántos pendientes se ven en la tarjeta; el resto, en Movimientos.
const MAX_PENDIENTES_A_LA_VISTA = 3;

const ICONO_POR_MODO = {
  revisando: "ph ph-envelope-simple-open",
  error: "ph ph-warning-circle",
  pendientes: "ph ph-tray",
  cargando: "ph ph-sparkle",
  nunca: "ph ph-envelope-simple",
  "al-dia": "ph ph-check-circle",
};

// Ícono grande + título + una línea. El número de pendientes va en una
// insignia mostaza sobre el ícono.
function Cabeza({ estado, pendientes, pie }) {
  return (
    <div className={`bandeja-cabeza bandeja-cabeza--${estado.modo}`}>
      <span className="bandeja-icono" aria-hidden="true">
        <i className={ICONO_POR_MODO[estado.modo]} />
        {estado.modo === "pendientes" && <span className="bandeja-insignia">{pendientes > 99 ? "99+" : pendientes}</span>}
      </span>
      <div className="bandeja-textos">
        <p className="bandeja-titulo">{estado.titulo}</p>
        {pie && <p className="texto-chico texto-tenue">{pie}</p>}
      </div>
    </div>
  );
}

// Una fila por pendiente: comercio, de qué mail vino, fecha y monto.
function Pendiente({ mov, moneda, onAbrir }) {
  const esIngreso = mov.tipo === "ingreso";
  const monto = fmtMoney(mov.monto, moneda);
  const nombre = mov.descripcion || "Sin descripción";
  return (
    <li>
      <button
        type="button"
        className="pendiente"
        onClick={() => onAbrir(mov)}
        aria-label={`Revisar ${esIngreso ? "ingreso" : "gasto"} ${nombre}, ${esIngreso ? "más" : "menos"} ${monto}, del ${fmtFecha(mov.fecha)}${mov.sinConfirmar ? ", sin confirmar" : ""}`}
      >
        <span className={"pendiente-avatar" + (esIngreso ? " es-ingreso" : "")} aria-hidden="true">
          {nombre.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="pendiente-texto">
          <span className="pendiente-nombre">{nombre}</span>
          <span className="texto-chico texto-tenue">
            {/* El remitente solo si dice algo más que el nombre (Steam · Steam no). */}
            {mov.origenMail && mov.origenMail.toLowerCase() !== nombre.toLowerCase() ? `${mov.origenMail} · ` : ""}
            {fmtFecha(mov.fecha)}
            {mov.sinConfirmar && <span className="pendiente-sin-confirmar"> · sin confirmar</span>}
          </span>
        </span>
        <span className={"movimiento-monto" + (esIngreso ? " es-ingreso" : "")}>
          {esIngreso ? "+" : "-"}
          {monto}
        </span>
        <i className="ph ph-caret-right pendiente-flecha" aria-hidden="true" />
      </button>
    </li>
  );
}

function Avisos({ revision, compacto }) {
  const avisos = avisosRevisionMails(revision);
  if (avisos.length === 0) return null;
  if (compacto) {
    return (
      <p className="texto-chico revision-aviso-corto">
        <i className="ph ph-warning" aria-hidden="true" />{" "}
        {avisos.length === 1 ? "1 aviso en Configuración" : `${avisos.length} avisos en Configuración`}
      </p>
    );
  }
  return (
    <ul className="lista revision-avisos">
      {avisos.map((aviso) => (
        <li key={aviso} className="texto-chico">
          <i className="ph ph-warning" aria-hidden="true" />
          <span>{aviso}</span>
        </li>
      ))}
    </ul>
  );
}

// La última revisión en una línea: "Hace 5 min · últimos 7 días".
function lineaUltimaRevision(revision, dias) {
  if (!revision) return "";
  const cuando = haceCuanto(revision.cuando) || revision.cuando;
  const diasRev = revision.dias || dias;
  return [cuando ? `Última revisión ${cuando}` : "", diasRev ? `últimos ${diasRev} días` : ""].filter(Boolean).join(" · ");
}

function Consejos({ dias, onIrABusqueda, onRevisar, onClose }) {
  return (
    <Dialog titulo="¿No aparece tu gasto?" onClose={onClose}>
      <ul className="lista revision-consejos-lista">
        <li>
          <i className="ph ph-bank" aria-hidden="true" />
          <div className="pila-chica">
            <p>
              <strong>Sumá tu banco o la tienda.</strong> Sin ayuda solo reconozco Mercado Pago y Steam.
            </p>
            {onIrABusqueda && (
              <button
                type="button"
                className="btn btn-primary btn-alinear-inicio"
                data-autofocus
                onClick={() => {
                  onClose();
                  onIrABusqueda();
                }}
              >
                Agregar mi banco
              </button>
            )}
          </div>
        </li>
        {dias < 30 && (
          <li>
            <i className="ph ph-calendar-blank" aria-hidden="true" />
            <div className="pila-chica">
              <p>
                <strong>¿Es de antes del {desdeFecha(dias)}?</strong> Mirá más para atrás.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-alinear-inicio"
                onClick={() => {
                  onClose();
                  onRevisar(30);
                }}
              >
                Revisar 30 días
              </button>
            </div>
          </li>
        )}
        <li>
          <i className="ph ph-funnel" aria-hidden="true" />
          <p>
            <strong>Las promociones no cuentan.</strong> Solo leo compras, pagos y transferencias.
          </p>
        </li>
      </ul>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>
  );
}

function ComoFunciona({ onClose }) {
  return (
    <Dialog titulo="Cómo funciona" onClose={onClose}>
      <ul className="lista revision-consejos-lista">
        <li>
          <i className="ph ph-magnifying-glass" aria-hidden="true" />
          <p>Busco en tu Gmail mails de compras, pagos y transferencias de los días que elijas.</p>
        </li>
        <li>
          <i className="ph ph-tag" aria-hidden="true" />
          <p>Te los dejo acá para revisar: elegís la categoría y la cuenta, y los confirmás o los descartás.</p>
        </li>
        <li>
          <i className="ph ph-shield-check" aria-hidden="true" />
          <p>
            Hasta que los confirmes no suman a tus gastos. Solo los de Mercado Pago, que leo exactos, entran directo
            con la etiqueta «A revisar».
          </p>
        </li>
        <li>
          <i className="ph ph-lock" aria-hidden="true" />
          <p>Solo leo: nunca borro ni mando mails.</p>
        </li>
      </ul>
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Entendido
        </button>
      </div>
    </Dialog>
  );
}

function AjustesDialog({ modo, onCambiarModo, irABusqueda, onClose }) {
  // Al venir de «Agregar mi banco», baja directo a la búsqueda personalizada
  // (tarda un momento en cargar).
  useEffect(() => {
    if (!irABusqueda) return;
    let intentos = 0;
    const id = setInterval(() => {
      const destino = document.getElementById("busqueda-personalizada");
      intentos++;
      if (destino) {
        destino.scrollIntoView({ block: "start" });
        destino.focus();
      }
      if (destino || intentos > 20) clearInterval(id);
    }, 150);
    return () => clearInterval(id);
  }, [irABusqueda]);

  return (
    <Dialog titulo="Ajustes de mails" onClose={onClose}>
      <ModoMails modo={modo} onCambiar={onCambiarModo} />
      {modo !== "apagado" && <AjustesMails modo={modo} />}
      <div className="dialog-actions">
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Dialog>
  );
}

// "compacto" (Resumen): sin días, sin tuerquita; eso vive en Configuración.
// pendientes: los movimientos «A revisar» de la lista (gastos e ingresos,
// con tipo). Con categorias se abren acá mismo; si no, onVerTodos.
export default function RevisionMails({
  revision,
  revisando,
  dias = DIAS_REVISION_MAILS,
  modo,
  compacto = false,
  pendientes = [],
  cargandoPendientes = false,
  categorias,
  cuentas,
  monedaPorCuenta = {},
  onCambiarModo,
  onCambiarDias,
  onRevisar,
  onVerTodos,
  onCambio,
}) {
  const nombre = useId();
  const [consejosAbiertos, setConsejosAbiertos] = useState(false);
  const [infoAbierta, setInfoAbierta] = useState(false);
  // null = cerrado; "general" o "busqueda" (baja a agregar el banco).
  const [ajustes, setAjustes] = useState(null);
  const [bancos, setBancos] = useState(bancosCache || []);
  const [abierto, setAbierto] = useState(null);

  // Los bancos se leen una vez y otra cada vez que se cierran los ajustes,
  // por si agregó alguno. No en cada cambio de pestaña, y solo con el permiso
  // de mails vigente: renovarlo abre y cierra una ventanita de Google. Si no
  // se pueden leer, el progreso dice "bancos" a secas.
  const abrioAjustes = useRef(false);
  useEffect(() => {
    if (ajustes) {
      abrioAjustes.current = true;
      return;
    }
    if (bancosCache && !abrioAjustes.current) return;
    abrioAjustes.current = false;
    if (!hayTokenMailsVigente()) return;
    let cancelado = false;
    getAjustesMails()
      .then((a) => {
        bancosCache = nombresDeRemitentes(a?.remitentes || []);
        if (!cancelado) setBancos(bancosCache);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [ajustes]);

  // Al terminar, la barra se llena un momento y después sale el resultado
  // (y los consejos, si toca).
  // Se detecta el momento en que termina comparando con el render anterior
  // (sin efecto de por medio, así la barra no parpadea).
  const [revisandoAntes, setRevisandoAntes] = useState(revisando);
  const [llenando, setLlenando] = useState(false);
  // La revisión que terminó, para decidir los consejos cuando se llena la barra.
  const [terminada, setTerminada] = useState(null);
  if (revisando !== revisandoAntes) {
    setRevisandoAntes(revisando);
    if (!revisando && revision) {
      setLlenando(true);
      setTerminada(revision);
    }
  }
  useEffect(() => {
    if (!llenando) return;
    const id = setTimeout(() => {
      setLlenando(false);
      const r = terminada;
      if (!r || r.error) return;
      if (r.nuevos > 0) {
        reiniciarVacias();
        return;
      }
      const vacias = contarVacia();
      if (vacias === 1 || vacias % VACIAS_PARA_CONSEJOS === 0) setConsejosAbiertos(true);
    }, MS_BARRA_LLENA);
    return () => clearTimeout(id);
  }, [llenando, terminada]);

  const ocupado = revisando || llenando;
  const estado = estadoBandeja({
    revision,
    pendientes: pendientes.length,
    revisando: ocupado,
    cargandoPendientes,
  });
  const ultima = lineaUltimaRevision(revision, dias);
  let pie = ultima;
  if (estado.modo === "error") pie = estado.detalle;
  else if (estado.modo === "al-dia") pie = `${ultima}: ${estado.detalle}.`;
  else if (estado.modo === "pendientes") {
    pie = pendientes.some((p) => p.sinConfirmar)
      ? "Los sin confirmar no suman a tus gastos hasta que los confirmes."
      : "Tocalos para elegir la categoría y confirmarlos.";
  } else if (estado.modo === "nunca") pie = "Busco tus compras y pagos en Gmail y te los dejo acá para confirmar.";
  else if (estado.modo === "revisando") pie = "";

  const aLaVista = pendientes.slice(0, MAX_PENDIENTES_A_LA_VISTA);
  const resto = pendientes.length - aLaVista.length;
  const puedeAbrirAca = !!categorias;
  function abrir(mov) {
    if (puedeAbrirAca) setAbierto(mov);
    else onVerTodos?.();
  }

  const botonInfo = (
    <button
      type="button"
      className="btn btn-icono"
      onClick={() => setInfoAbierta(true)}
      aria-label="Cómo funciona la revisión de mails"
    >
      <i className="ph ph-info" aria-hidden="true" />
    </button>
  );

  return (
    <div className="revision-mails">
      {!compacto && (
        <div className="revision-cabeza">
          <fieldset className="revision-dias" disabled={ocupado}>
            <legend className="visualmente-oculto">Qué mails revisar</legend>
            <div className="seg">
              {OPCIONES_DIAS_MAILS.map((d) => (
                <label className="seg-opt" key={d}>
                  <input
                    type="radio"
                    name={nombre}
                    checked={dias === d}
                    onChange={() => onCambiarDias(d)}
                    aria-label={`Los últimos ${d} días`}
                  />
                  {d} días
                </label>
              ))}
            </div>
          </fieldset>
          <div className="fila revision-botones">
            {botonInfo}
            {onCambiarModo && (
              <button
                type="button"
                className="btn btn-icono"
                onClick={() => setAjustes("general")}
                aria-label="Ajustes de mails: cuándo revisar, tus bancos y avisos"
              >
                <i className="ph ph-gear-six" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bandeja" aria-live="polite" role={estado.modo === "error" ? "alert" : undefined}>
        <Cabeza estado={estado} pendientes={pendientes.length} pie={pie} />

        {ocupado && <Progreso bancos={bancos} completo={llenando} />}

        {!ocupado && aLaVista.length > 0 && (
          <ul className="lista bandeja-lista">
            {aLaVista.map((mov, i) => (
              <Pendiente
                key={`${mov.tipo}-${mov.idMail || ""}-${mov.fecha}-${mov.hora || ""}-${mov.monto}-${i}`}
                mov={mov}
                moneda={mov.moneda || monedaPorCuenta[mov.cuenta] || "ARS"}
                onAbrir={abrir}
              />
            ))}
          </ul>
        )}

        {!ocupado && estado.modo === "cargando" && (
          <div className="bandeja-lista" aria-hidden="true">
            <SkeletonFilas cantidad={Math.min(Number(revision?.nuevos) || 1, MAX_PENDIENTES_A_LA_VISTA)} />
          </div>
        )}

        {!ocupado && estado.modo === "pendientes" && (
          <p className="texto-chico texto-tenue bandeja-ultima">
            {ultima}
            {resto > 0 && onVerTodos && (
              <>
                {" · "}
                <button type="button" className="btn-link" onClick={onVerTodos}>
                  Ver {resto === 1 ? "1 más" : `${resto} más`} en Movimientos
                </button>
              </>
            )}
          </p>
        )}

        {!ocupado && revision && <Avisos revision={revision} compacto={compacto} />}
      </div>

      <div className="fila bandeja-acciones">
        <button
          type="button"
          className={estado.modo === "pendientes" ? "btn btn-secondary" : "btn btn-primary"}
          onClick={() => onRevisar(dias)}
          disabled={ocupado}
        >
          <i className={estado.modo === "error" ? "ph ph-arrow-clockwise" : "ph ph-envelope-simple"} aria-hidden="true" />
          {ocupado ? "Revisando…" : estado.modo === "error" ? "Reintentar" : "Revisar mis mails"}
        </button>
        {/* En el Resumen la «i» va al lado del botón; en Configuración, arriba. */}
        {compacto && botonInfo}
        {!ocupado && (estado.modo === "al-dia" || estado.modo === "nunca") && revision && (
          <button type="button" className="btn-link" onClick={() => setConsejosAbiertos(true)}>
            ¿Te falta algún gasto?
          </button>
        )}
      </div>

      {abierto && (
        <EditarMovimientoDialog
          movimiento={abierto}
          tipo={abierto.tipo || "gasto"}
          categorias={categorias}
          cuentas={cuentas}
          monedaPorCuenta={monedaPorCuenta}
          onClose={() => setAbierto(null)}
          onGuardado={() => onCambio?.(abierto.tipo)}
        />
      )}
      {consejosAbiertos && (
        <Consejos
          dias={revision?.dias || dias}
          onIrABusqueda={onCambiarModo ? () => setAjustes("busqueda") : null}
          onRevisar={onRevisar}
          onClose={() => setConsejosAbiertos(false)}
        />
      )}
      {infoAbierta && <ComoFunciona onClose={() => setInfoAbierta(false)} />}
      {ajustes && (
        <AjustesDialog
          modo={modo}
          onCambiarModo={onCambiarModo}
          irABusqueda={ajustes === "busqueda"}
          onClose={() => setAjustes(null)}
        />
      )}
    </div>
  );
}

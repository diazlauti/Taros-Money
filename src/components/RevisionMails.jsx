import { useEffect, useId, useRef, useState } from "react";
import { getAjustesMails } from "../api";
import { nombresDeRemitentes } from "../bancosMails";
import { fmtMoney, haceCuanto } from "../format";
import { DIAS_REVISION_MAILS, OPCIONES_DIAS_MAILS } from "../revisionMails";
import AjustesMails from "./AjustesMails";
import Dialog from "./Dialog";
import ModoMails from "./ModoMails";

// La revisión de mails: cuántos días mira, el botón, una barra mientras
// busca y el resultado. Poco texto a la vista: la explicación está en el
// botón «i» y los consejos salen en un pop-up cuando no encuentra nada.
// Se usa en el Resumen y en Configuración.

// La revisión es un solo pedido a Google, que no avisa cuánto falta: la
// barra avanza con lo que suele tardar cada parte y se completa al terminar.
// Los bancos que agregó la persona salen por nombre y resaltados.
const SEGUNDOS_POR_PASO = 3.5;

function armarPasos(bancos) {
  return [
    { texto: "Conectando con tu Gmail…" },
    { texto: "Buscando en", nombre: "Mercado Pago" },
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

// Cuántas revisiones seguidas sin nada nuevo (en esta sesión) hacen falta
// para ofrecer los consejos cuando sí hay mails pero ya estaban cargados.
const VACIAS_PARA_CONSEJOS = 2;

function desdeFecha(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function Progreso({ bancos }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setSegundos((Date.now() - inicio) / 1000), 250);
    return () => clearInterval(id);
  }, []);
  // Llega rápido a la mitad y después se frena; nunca pasa de 95% sola.
  const pct = Math.round(95 * (1 - Math.exp(-segundos / 12)));
  const pasos = armarPasos(bancos);
  const indice = Math.min(Math.floor(segundos / SEGUNDOS_POR_PASO), pasos.length - 1);
  const paso = pasos[indice];
  return (
    <div className="revision-progreso" role="status" aria-live="polite">
      <div className="revision-progreso-cabeza">
        <span className="revision-paso" key={indice}>
          {paso.texto}
          {paso.nombre && (
            <>
              {" "}
              <span className={paso.propio ? "revision-banco revision-banco--propio" : "revision-banco"}>{paso.nombre}</span>…
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

function Resultado({ revision, dias, onReintentar, onVerEncontrados, onVerConsejos }) {
  const cuando = haceCuanto(revision.cuando) || revision.cuando;
  const diasRev = revision.dias || dias;

  if (revision.error) {
    return (
      <div className="revision-resultado revision-resultado--error" role="alert">
        <i className="ph ph-warning-circle revision-resultado-icono" aria-hidden="true" />
        <div className="pila-chica">
          <p className="revision-titulo">No pude revisar tus mails</p>
          <p className="texto-chico">{revision.error}</p>
          {onReintentar && (
            <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={() => onReintentar()}>
              <i className="ph ph-arrow-clockwise" aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  let icono = "ph ph-check-circle";
  let titulo = "Revisé tus mails";
  let detalle = "";
  let modo = "ok";
  if (revision.nuevos > 0) {
    icono = "ph ph-sparkle";
    modo = "nuevo";
    titulo = revision.nuevos === 1 ? "¡Encontré 1 movimiento!" : `¡Encontré ${revision.nuevos} movimientos!`;
  } else if (revision.revisados === 0) {
    icono = "ph ph-magnifying-glass";
    modo = "vacio";
    titulo = "No encontré nada";
  } else if (typeof revision.revisados === "number") {
    titulo = "Nada nuevo";
    detalle = revision.yaEstaban > 0 ? `${revision.yaEstaban} ya estaban cargados` : "";
  } else if (revision.nuevos === 0) {
    titulo = "Nada nuevo";
  }
  const pie = [cuando, diasRev ? `últimos ${diasRev} días` : "", detalle].filter(Boolean).join(" · ");

  return (
    <div className={`revision-resultado revision-resultado--${modo}`} aria-live="polite">
      <i className={`${icono} revision-resultado-icono`} aria-hidden="true" />
      <div className="pila-chica">
        <p className="revision-titulo">{titulo}</p>
        {revision.encontrados?.length > 0 && (
          <ul className="lista revision-encontrados">
            {revision.encontrados.map((g, i) => (
              <li key={i}>
                <span>{g.descripcion || "Sin descripción"}</span>
                <span className="negrita">
                  {g.tipo === "ingreso" ? "+" : ""}
                  {fmtMoney(g.monto)}
                </span>
              </li>
            ))}
            {revision.nuevos > revision.encontrados.length && (
              <li className="texto-tenue">y {revision.nuevos - revision.encontrados.length} más</li>
            )}
          </ul>
        )}
        <p className="texto-tenue texto-chico">{pie}</p>
        {revision.nuevos > 0 && onVerEncontrados && (
          <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={onVerEncontrados}>
            Revisarlos
          </button>
        )}
        {modo !== "nuevo" && (
          <button type="button" className="btn-link btn-alinear-inicio" onClick={onVerConsejos}>
            ¿Te falta algún gasto?
          </button>
        )}
      </div>
    </div>
  );
}

function Consejos({ dias, onIrABusqueda, onRevisar, onClose }) {
  return (
    <Dialog titulo="¿No aparece tu gasto?" onClose={onClose}>
      <ul className="lista revision-consejos-lista">
        <li>
          <i className="ph ph-bank" aria-hidden="true" />
          <div className="pila-chica">
            <p>
              <strong>Sumá tu banco.</strong> Sin ayuda solo reconozco Mercado Pago.
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
          <p>Los anoto en Movimientos como «A revisar», para que los confirmes.</p>
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

export default function RevisionMails({ revision, revisando, dias = DIAS_REVISION_MAILS, modo, onCambiarModo, onCambiarDias, onRevisar, onVerEncontrados }) {
  const nombre = useId();
  const [consejosAbiertos, setConsejosAbiertos] = useState(false);
  const [infoAbierta, setInfoAbierta] = useState(false);
  // null = cerrado; "general" o "busqueda" (baja a agregar el banco).
  const [ajustes, setAjustes] = useState(null);
  const [bancos, setBancos] = useState(bancosCache || []);

  // Cada vez que se cierran los ajustes se vuelven a leer los bancos, por si
  // agregó alguno. Si falla no pasa nada: el progreso dice "bancos" a secas.
  useEffect(() => {
    if (ajustes) return;
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

  // Al terminar una revisión de esta sesión sin nada nuevo, salen los
  // consejos: siempre si no encontró ningún mail, y si encontró pero ya
  // estaban, recién después de varias seguidas.
  const estabaRevisando = useRef(false);
  const vaciasSeguidas = useRef(0);
  useEffect(() => {
    if (revisando) {
      estabaRevisando.current = true;
      return;
    }
    if (!estabaRevisando.current || !revision) return;
    estabaRevisando.current = false;
    if (revision.error) return;
    if (revision.nuevos > 0) {
      vaciasSeguidas.current = 0;
      return;
    }
    vaciasSeguidas.current += 1;
    if (revision.revisados === 0 || vaciasSeguidas.current >= VACIAS_PARA_CONSEJOS) setConsejosAbiertos(true);
  }, [revisando, revision]);

  return (
    <div className="revision-mails">
      <div className="revision-cabeza">
        <fieldset className="revision-dias" disabled={revisando}>
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
          <button type="button" className="btn btn-icono" onClick={() => setInfoAbierta(true)} aria-label="Cómo funciona la revisión de mails">
            <i className="ph ph-info" aria-hidden="true" />
          </button>
          {onCambiarModo && (
            <button type="button" className="btn btn-icono" onClick={() => setAjustes("general")} aria-label="Ajustes de mails: cuándo revisar, tus bancos y avisos">
              <i className="ph ph-gear-six" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={() => onRevisar(dias)} disabled={revisando}>
        <i className="ph ph-envelope-simple" aria-hidden="true" />
        {revisando ? "Revisando…" : "Revisar mis mails"}
      </button>

      {revisando ? (
        <Progreso bancos={bancos} />
      ) : (
        revision && (
          <Resultado
            revision={revision}
            dias={dias}
            onReintentar={onRevisar}
            onVerEncontrados={onVerEncontrados}
            onVerConsejos={() => setConsejosAbiertos(true)}
          />
        )
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

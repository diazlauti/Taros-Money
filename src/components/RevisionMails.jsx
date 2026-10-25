import { useEffect, useId, useState } from "react";
import { fmtMoney, haceCuanto } from "../format";
import { DIAS_REVISION_MAILS, OPCIONES_DIAS_MAILS } from "../revisionMails";

// La revisión de mails entera: cuántos días mira (y elegirlo), el botón, una
// barra de progreso mientras busca y el resultado bien grande, con consejos
// cuando no encuentra nada. Se usa en el Resumen y en Configuración.

// La revisión es un solo pedido a Google, no avisa cuánto le falta: la barra
// avanza con el tiempo que suele tardar cada parte y se completa al terminar.
const PASOS = [
  [0, "Conectando con tu Gmail…"],
  [3, "Buscando pagos de Mercado Pago…"],
  [8, "Buscando mails de tus bancos y billeteras…"],
  [15, "Buscando otros comprobantes de compras y transferencias…"],
  [24, "Anotando en tu planilla lo que encontré…"],
];

function desdeFecha(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function Progreso({ dias }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const inicio = Date.now();
    const id = setInterval(() => setSegundos((Date.now() - inicio) / 1000), 250);
    return () => clearInterval(id);
  }, []);
  // Llega rápido a la mitad y después se frena; nunca pasa de 95% sola.
  const pct = Math.round(95 * (1 - Math.exp(-segundos / 12)));
  const paso = PASOS.filter(([desde]) => segundos >= desde).pop()[1];
  return (
    <div className="revision-progreso" role="status" aria-live="polite">
      <div className="revision-progreso-cabeza">
        <span className="negrita">{paso}</span>
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
      <p className="texto-tenue texto-chico">
        Revisando los mails de los últimos {dias} días. Puede tardar hasta un minuto, podés seguir usando la app.
      </p>
    </div>
  );
}

function Consejos({ dias, onIrABusqueda, onRevisar, revisando }) {
  return (
    <div className="revision-consejos">
      <p className="negrita">¿Te falta algún gasto? Probá esto:</p>
      <ul className="lista revision-consejos-lista">
        <li>
          <i className="ph ph-bank" aria-hidden="true" />
          <span>
            <strong>Agregá tu banco o billetera.</strong> Por ahora solo reconozco sin ayuda a Mercado Pago. Abrí un
            mail reciente de una compra, fijate quién te lo mandó (ej: alertas@tubanco.com.ar) y sumalo a tu búsqueda.
            {onIrABusqueda && (
              <button type="button" className="btn btn-secondary btn-chico revision-consejo-accion" onClick={onIrABusqueda}>
                <i className="ph ph-plus" aria-hidden="true" />
                Agregar mi banco
              </button>
            )}
          </span>
        </li>
        {dias < 30 && (
          <li>
            <i className="ph ph-calendar-blank" aria-hidden="true" />
            <span>
              <strong>¿Es de antes del {desdeFecha(dias)}?</strong> Esta revisión miró solo los últimos {dias} días.
              <button
                type="button"
                className="btn btn-secondary btn-chico revision-consejo-accion"
                onClick={() => onRevisar(30)}
                disabled={revisando}
              >
                <i className="ph ph-clock-counter-clockwise" aria-hidden="true" />
                Revisar los últimos 30 días
              </button>
            </span>
          </li>
        )}
        <li>
          <i className="ph ph-funnel" aria-hidden="true" />
          <span>
            <strong>Las promociones no cuentan.</strong> Solo leo mails de compras, pagos y transferencias que estén
            en tu bandeja (no en Promociones ni en Social de Gmail).
          </span>
        </li>
      </ul>
    </div>
  );
}

function Resultado({ revision, dias, onReintentar, onVerEncontrados }) {
  const cuando = haceCuanto(revision.cuando) || revision.cuando;
  const diasRev = revision.dias || dias;

  if (revision.error) {
    return (
      <div className="revision-resultado revision-resultado--error" role="alert">
        <i className="ph ph-warning-circle revision-resultado-icono" aria-hidden="true" />
        <div className="pila-chica">
          <p className="revision-titulo">No pude revisar tus mails</p>
          <p className="texto-chico">{revision.error}</p>
          <p className="texto-tenue texto-chico">Fue {cuando}.</p>
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
    titulo = revision.nuevos === 1 ? "¡Encontré 1 movimiento nuevo!" : `¡Encontré ${revision.nuevos} movimientos nuevos!`;
    detalle = "Quedaron en Movimientos con la etiqueta «A revisar» para que los confirmes.";
  } else if (revision.revisados === 0) {
    icono = "ph ph-magnifying-glass";
    modo = "vacio";
    titulo = "No encontré mails de compras";
    detalle = `Busqué en los mails que te llegaron en los últimos ${diasRev} días y ninguno parecía una compra, un pago o una transferencia.`;
  } else if (typeof revision.revisados === "number") {
    titulo = "Nada nuevo: ya tenés todo cargado";
    const yaEstaban = revision.yaEstaban > 0 ? ` ${revision.yaEstaban} ya estaban en tu planilla.` : "";
    detalle = `Revisé ${revision.revisados === 1 ? "1 mail" : `${revision.revisados} mails`} de compras y pagos de los últimos ${diasRev} días.${yaEstaban}`;
  } else if (revision.nuevos === 0) {
    titulo = "No encontré movimientos nuevos";
  }

  return (
    <div className={`revision-resultado revision-resultado--${modo}`} aria-live="polite">
      <i className={`${icono} revision-resultado-icono`} aria-hidden="true" />
      <div className="pila-chica">
        <p className="revision-titulo">{titulo}</p>
        {detalle && <p className="texto-chico">{detalle}</p>}
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
        {revision.nuevos > 0 && onVerEncontrados && (
          <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={onVerEncontrados}>
            Revisarlos
          </button>
        )}
        <p className="texto-tenue texto-chico">
          <i className="ph ph-clock" aria-hidden="true" /> {cuando}
          {diasRev ? ` · últimos ${diasRev} días` : ""}
        </p>
      </div>
    </div>
  );
}

export default function RevisionMails({ revision, revisando, dias = DIAS_REVISION_MAILS, onCambiarDias, onRevisar, onVerEncontrados, onIrABusqueda }) {
  const nombre = useId();
  const sinNovedades = revision && !revision.error && !(revision.nuevos > 0);

  return (
    <div className="revision-mails">
      <fieldset className="field" disabled={revisando}>
        <legend>Qué mails revisar</legend>
        <div className="seg" role="radiogroup" aria-label="Días para atrás">
          {OPCIONES_DIAS_MAILS.map((d) => (
            <label className="seg-opt" key={d}>
              <input type="radio" name={nombre} checked={dias === d} onChange={() => onCambiarDias(d)} />
              {d} días
            </label>
          ))}
        </div>
        <p className="field-ayuda">
          Los que te llegaron desde el {desdeFecha(dias)} hasta hoy. Nunca se borra ni se manda nada.
        </p>
      </fieldset>

      <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={() => onRevisar(dias)} disabled={revisando}>
        <i className="ph ph-envelope-simple" aria-hidden="true" />
        {revisando ? "Revisando…" : "Revisar mis mails ahora"}
      </button>

      {revisando ? (
        <Progreso dias={dias} />
      ) : revision ? (
        <Resultado revision={revision} dias={dias} onReintentar={onRevisar} onVerEncontrados={onVerEncontrados} />
      ) : (
        <p className="aviso-inline">
          <i className="ph ph-info" aria-hidden="true" />
          <span>
            Todavía no revisé tus mails. Busco pagos de Mercado Pago, los mails de los bancos que agregues y otros
            comprobantes de compras y transferencias.
          </span>
        </p>
      )}

      {!revisando && sinNovedades && (
        <Consejos dias={revision.dias || dias} onIrABusqueda={onIrABusqueda} onRevisar={onRevisar} revisando={revisando} />
      )}
    </div>
  );
}

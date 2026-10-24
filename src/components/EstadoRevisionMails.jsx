import { haceCuanto } from "../format";
import { DIAS_REVISION_MAILS } from "../revisionMails";

// Qué pasó en la última revisión de mails, fijo en pantalla (antes solo
// salía un aviso que se iba, y si no encontraba nada al abrir no decía nada).
export default function EstadoRevisionMails({ revision, revisando, onReintentar }) {
  const dias = revision?.dias || DIAS_REVISION_MAILS;

  if (revisando) {
    return (
      <p className="aviso-inline" role="status" aria-live="polite">
        <i className="ph ph-hourglass-medium" aria-hidden="true" />
        Revisando tus mails de los últimos {dias} días…
      </p>
    );
  }

  if (!revision) {
    return (
      <p className="aviso-inline" aria-live="polite">
        <i className="ph ph-clock" aria-hidden="true" />
        Todavía no se revisaron tus mails. Cada revisión mira los últimos {DIAS_REVISION_MAILS} días.
      </p>
    );
  }

  const cuando = haceCuanto(revision.cuando);

  if (revision.error) {
    return (
      <div className="estado estado--error" role="alert">
        <i className="ph ph-warning-circle" aria-hidden="true" />
        <p>
          La última revisión{cuando ? ` (${cuando})` : ""} no funcionó: {revision.error}
        </p>
        {onReintentar && (
          <button type="button" className="btn btn-secondary" onClick={onReintentar}>
            <i className="ph ph-arrow-clockwise" aria-hidden="true" />
            Reintentar
          </button>
        )}
      </div>
    );
  }

  let detalle = "";
  if (typeof revision.revisados === "number") {
    const yaEstaban = revision.yaEstaban > 0 ? ` (${revision.yaEstaban} ya estaban cargados)` : "";
    if (revision.nuevos > 0) {
      detalle =
        revision.nuevos === 1
          ? "Encontré 1 movimiento nuevo. Está en Movimientos, «A revisar»."
          : `Encontré ${revision.nuevos} movimientos nuevos. Están en Movimientos, «A revisar».`;
    } else if (revision.revisados === 0) {
      detalle = `No encontré mails de compras ni pagos de los últimos ${dias} días. Si tu banco o billetera no es Mercado Pago, agregalo en «Búsqueda personalizada» (Configuración).`;
    } else {
      detalle = `Revisé ${revision.revisados === 1 ? "1 mail" : `${revision.revisados} mails`} de compras y pagos de los últimos ${dias} días: nada nuevo${yaEstaban}.`;
    }
  }

  return (
    <p className="aviso-inline" aria-live="polite">
      <i className={revision.nuevos > 0 ? "ph ph-envelope-simple-open" : "ph ph-check-circle"} aria-hidden="true" />
      <span>
        Última revisión: {cuando || revision.cuando}.{detalle ? ` ${detalle}` : ""}
      </span>
    </p>
  );
}

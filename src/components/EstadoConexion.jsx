// Cartel chico debajo del encabezado: sin conexión, subiendo lo pendiente o
// algo que no se pudo subir. Con todo en orden no se ve.
export default function EstadoConexion({ conectado, sinSubir, conError, subiendo, guardadoEl, onReintentar, onVer }) {
  let icono;
  let texto;
  let accion = null;
  let variante = "";

  if (!conectado) {
    icono = "ph-cloud-slash";
    const hace = haceCuanto(guardadoEl);
    texto = `Sin conexión${hace ? ` · datos de ${hace}` : ""}`;
    if (sinSubir) texto += ` · ${sinSubir} sin subir`;
  } else if (subiendo) {
    icono = "ph-cloud-arrow-up";
    texto = "Subiendo lo que cargaste sin conexión…";
  } else if (conError) {
    icono = "ph-warning-circle";
    variante = " estado-conexion--error";
    texto = conError === 1 ? "1 movimiento no se pudo subir" : `${conError} movimientos no se pudieron subir`;
    accion = { texto: "Ver", onClick: onVer };
  } else if (sinSubir) {
    icono = "ph-cloud-arrow-up";
    texto = sinSubir === 1 ? "1 movimiento sin subir" : `${sinSubir} movimientos sin subir`;
    accion = { texto: "Reintentar", onClick: onReintentar };
  }

  return (
    <div className="estado-conexion-lugar" role="status" aria-live="polite">
      {texto && (
        <p className={"estado-conexion" + variante}>
          <i className={`ph ${icono}`} aria-hidden="true" />
          <span>{texto}</span>
          {accion && (
            <button type="button" className="btn-link estado-conexion-accion" onClick={accion.onClick}>
              {accion.texto}
            </button>
          )}
        </p>
      )}
    </div>
  );
}

// Milisegundos → "recién", "hace 5 min", "hace 2 h", "hace 3 días".
function haceCuanto(cuando) {
  if (!cuando) return "";
  const minutos = Math.round((Date.now() - cuando) / 60000);
  if (minutos < 1) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  if (minutos < 24 * 60) return `hace ${Math.round(minutos / 60)} h`;
  const dias = Math.round(minutos / (24 * 60));
  return dias === 1 ? "ayer" : `hace ${dias} días`;
}

// En la fila de un movimiento que todavía no está en la planilla.
export function EtiquetaSinSubir({ movimiento }) {
  if (!movimiento.pendiente) return null;
  const fallo = !!movimiento.errorCola;
  return (
    <span className={"tag tag-sin-subir" + (fallo ? " tag-sin-subir--error" : "")}>
      <i className={`ph ${fallo ? "ph-warning-circle" : "ph-cloud-slash"}`} aria-hidden="true" />
      {fallo ? "No se pudo subir" : "Sin subir"}
    </span>
  );
}

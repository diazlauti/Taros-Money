import { avisarDelError } from "../reportarError";

// Mensaje de error de un formulario o una acción, con «Avisar del error»
// al lado para mandarlo con un toque. `avisable={false}` para los que son
// un dato que falta y no una falla.
export default function MensajeError({ children, className = "", avisable = true }) {
  return (
    <div className="mensaje-error-fila">
      <p className={`mensaje-error ${className}`.trim()} role="alert">
        {children}
      </p>
      {avisable && <BotonAvisarError texto={children} />}
    </div>
  );
}

export function BotonAvisarError({ texto }) {
  return (
    <button
      type="button"
      className="btn btn-texto btn-avisar-error"
      onClick={() => avisarDelError(typeof texto === "string" ? texto : "")}
    >
      <i className="ph ph-paper-plane-tilt" aria-hidden="true" />
      <span>Avisar del error</span>
    </button>
  );
}

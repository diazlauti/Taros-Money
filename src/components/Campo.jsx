import { useId } from "react";
import Explicacion from "./Explicacion";

// Campo con su <label> asociado, ayuda y error. El input se pasa como
// función para recibir id/aria-* ya armados:
//   <Campo etiqueta="Monto" error={e}>{(p) => <input {...p} />}</Campo>
// `ayuda` queda escrita abajo (para datos que cambian, como un saldo).
// `explicacion` va en una «i» al lado de la etiqueta, para no sumar texto.
export default function Campo({ etiqueta, ayuda, explicacion, error, children }) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [ayuda && ayudaId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      {explicacion ? (
        <div className="field-cabeza">
          <label htmlFor={id}>{etiqueta}</label>
          <Explicacion texto={explicacion} etiqueta={`Más info: ${etiqueta}`} />
        </div>
      ) : (
        <label htmlFor={id}>{etiqueta}</label>
      )}
      {children({ id, "aria-invalid": error ? "true" : undefined, "aria-describedby": describedBy })}
      {ayuda && (
        <p className="field-ayuda" id={ayudaId}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}

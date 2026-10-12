import { useId } from "react";

// Campo con su <label> asociado, ayuda y error. El input se pasa como
// función para recibir id/aria-* ya armados:
//   <Campo etiqueta="Monto" error={e}>{(p) => <input {...p} />}</Campo>
export default function Campo({ etiqueta, ayuda, error, children }) {
  const id = useId();
  const ayudaId = `${id}-ayuda`;
  const errorId = `${id}-error`;
  const describedBy = [ayuda && ayudaId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{etiqueta}</label>
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

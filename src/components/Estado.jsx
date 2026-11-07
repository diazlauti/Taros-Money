import { createContext, useContext } from "react";
import { BotonAvisarError } from "./MensajeError";

// Si una pantalla ya muestra un error arriba, las tarjetas con el MISMO
// error lo dicen corto en vez de repetir el mensaje entero.
export const ErrorYaMostrado = createContext(null);

// Los 4 estados de todo lo que carga datos remotos: cargando (skeleton con
// la forma del contenido), error (mensaje + Reintentar), vacío (texto +
// acción) y éxito (el contenido).

export function Skeleton({ variante = "linea", ancho }) {
  return (
    <span
      className={`skeleton skeleton--${variante}`}
      style={ancho ? { "--ancho": ancho } : undefined}
      aria-hidden="true"
    />
  );
}

export function SkeletonFilas({ cantidad = 4 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: cantidad }, (_, i) => (
        <div className="skeleton-fila" key={i}>
          <span className="skeleton skeleton--icono" />
          <span className="pila-chica">
            <Skeleton ancho="70%" />
            <Skeleton ancho="40%" />
          </span>
          <span className="skeleton skeleton--corto" />
        </div>
      ))}
    </div>
  );
}

// Contenedor para el skeleton: avisa a los lectores de pantalla que está
// cargando (el skeleton en sí es decorativo).
export function Cargando({ texto, children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="visualmente-oculto">{texto}</span>
      {children}
    </div>
  );
}

// principal: el que explica el error (los demás con el mismo dicen solo "No se pudo cargar").
export function ErrorEstado({ mensaje, onReintentar, principal = false }) {
  const yaMostrado = useContext(ErrorYaMostrado);
  if (!principal && yaMostrado && yaMostrado === mensaje) {
    return (
      <div className="estado estado--error estado--corto">
        <p>
          <i className="ph ph-warning-circle" aria-hidden="true" /> No se pudo cargar.
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
  return (
    <div className="estado estado--error" role="alert">
      <i className="ph ph-warning-circle" aria-hidden="true" />
      <p>{mensaje}</p>
      <div className="fila">
        {onReintentar && (
          <button type="button" className="btn btn-secondary" onClick={onReintentar}>
            <i className="ph ph-arrow-clockwise" aria-hidden="true" />
            Reintentar
          </button>
        )}
        <BotonAvisarError texto={mensaje} />
      </div>
    </div>
  );
}

export function Vacio({ icono = "ph ph-tray", texto, children }) {
  return (
    <div className="estado">
      <i className={icono} aria-hidden="true" />
      <p>{texto}</p>
      {children && <div className="fila">{children}</div>}
    </div>
  );
}

import { PERIODOS } from "../theme";

// Período del Resumen (7 a 90 días). Va arriba de «En qué se fue» como un
// control segmentado, y cambia también lo que entró y salió de la tarjeta.
export default function PeriodoSelector({ dias, onCambiar }) {
  return (
    <div className="periodo" role="group" aria-label="Período" data-tour="periodo">
      {PERIODOS.map((p) => (
        <button key={p} type="button" className="periodo-opt" aria-pressed={dias === p} onClick={() => onCambiar(p)}>
          {p} días
        </button>
      ))}
    </div>
  );
}

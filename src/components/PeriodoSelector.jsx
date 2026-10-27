import { PERIODOS } from "../theme";

export default function PeriodoSelector({ dias, onCambiar }) {
  return (
    <div className="chips" role="group" aria-label="Período" data-tour="periodo">
      {PERIODOS.map((p) => (
        <button key={p} type="button" className="chip" aria-pressed={dias === p} onClick={() => onCambiar(p)}>
          {p} días
        </button>
      ))}
    </div>
  );
}

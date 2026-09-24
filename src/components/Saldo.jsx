export default function Saldo({ saldo, cargando }) {
  return (
    <div className="tarjeta tarjeta-saldo">
      <span className="etiqueta">Saldo estimado</span>
      {cargando ? (
        <span className="valor-saldo">…</span>
      ) : saldo === null || saldo === undefined ? (
        <span className="valor-saldo valor-saldo--vacio">sin datos</span>
      ) : (
        <span className="valor-saldo">${saldo.toFixed(2)}</span>
      )}
    </div>
  );
}

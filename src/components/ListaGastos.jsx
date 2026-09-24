function formatearFecha(fecha) {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

export default function ListaGastos({ gastos, cargando }) {
  if (cargando) return <p className="mensaje-estado">Cargando gastos…</p>;
  if (!gastos || gastos.length === 0) {
    return <p className="mensaje-estado">No hay gastos cargados en este período.</p>;
  }

  return (
    <ul className="lista-gastos">
      {gastos.map((g, i) => (
        <li key={i} className="fila-gasto">
          <div className="fila-gasto__fecha">
            {formatearFecha(g.fecha)}
            <span className="fila-gasto__hora">{g.hora}</span>
          </div>
          <div className="fila-gasto__detalle">
            <span className="fila-gasto__descripcion">
              {g.descripcion || "(sin descripción)"}
            </span>
            <span className="fila-gasto__categoria">
              {g.categoria || "sin categoría"}
            </span>
          </div>
          <div className="fila-gasto__monto">${g.monto.toFixed(2)}</div>
        </li>
      ))}
    </ul>
  );
}

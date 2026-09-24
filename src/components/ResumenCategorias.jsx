export default function ResumenCategorias({ resumen, cargando }) {
  if (cargando) return <p className="mensaje-estado">Cargando resumen…</p>;
  if (!resumen || resumen.totalGeneral === 0) {
    return <p className="mensaje-estado">No hay gastos cargados en este período.</p>;
  }

  const categorias = Object.entries(resumen.porCategoria).sort(
    (a, b) => b[1].total - a[1].total
  );

  return (
    <div className="resumen-categorias">
      <div className="resumen-total">
        Total del período: <strong>${resumen.totalGeneral.toFixed(2)}</strong>
      </div>
      <ul className="lista-barras">
        {categorias.map(([categoria, datos]) => {
          const porcentaje = (datos.total / resumen.totalGeneral) * 100;
          return (
            <li key={categoria} className="barra-categoria">
              <div className="barra-categoria__encabezado">
                <span>{categoria}</span>
                <span>
                  ${datos.total.toFixed(2)} ({porcentaje.toFixed(0)}%)
                </span>
              </div>
              <div className="barra-categoria__pista">
                <div
                  className="barra-categoria__relleno"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { fmtMoney } from "../format";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";

export default function ReportesTab({ tendencia, onNuevo }) {
  const lista = tendencia.data || [];

  if (tendencia.cargando) {
    return (
      <Cargando texto="Cargando reportes…">
        <div className="pila">
          <div className="card">
            <Skeleton ancho="60%" />
            <Skeleton variante="chart" />
          </div>
          <div className="card">
            <Skeleton ancho="40%" />
            <Skeleton variante="monto-medio" />
          </div>
        </div>
      </Cargando>
    );
  }
  if (tendencia.error && !tendencia.data) {
    return (
      <div className="card">
        <ErrorEstado mensaje={tendencia.error} onReintentar={tendencia.recargar} />
      </div>
    );
  }
  if (lista.length === 0) {
    return (
      <div className="card">
        <Vacio icono="ph ph-chart-line" texto="Todavía no hay historial. Cuando cargues movimientos, acá vas a ver cómo te fue cada mes.">
          <button type="button" className="btn btn-secondary" onClick={onNuevo}>
            <i className="ph ph-plus" aria-hidden="true" />
            Cargar un movimiento
          </button>
        </Vacio>
      </div>
    );
  }

  const maxVal = Math.max(...lista.map((m) => Math.max(m.ingresos, m.gastos)), 1);
  const ultimo = lista[lista.length - 1];
  const ahorro = ultimo.ingresos - ultimo.gastos;
  // Altura de cada barra como % del alto del gráfico (el alto sale del token --chart-h).
  const alto = (valor) => `${Math.round((valor / maxVal) * 100)}%`;

  return (
    <>
      <section className="card" aria-labelledby="titulo-tendencia">
        <h2 className="card-kicker" id="titulo-tendencia">
          Ingresos y gastos, últimos {lista.length} meses
        </h2>
        <ul className="lista fila" aria-label="Referencias">
          <li className="leyenda-item">
            <span className="punto punto--ingreso" />
            Ingresos
          </li>
          <li className="leyenda-item">
            <span className="punto punto--gasto" />
            Gastos
          </li>
        </ul>
        {/* El gráfico es decorativo para lectores de pantalla: los mismos
            datos están en la tabla de abajo. */}
        <div className="barras" aria-hidden="true">
          {lista.map((m) => (
            <div key={m.mes} className="barras-mes">
              <div className="barras-par">
                <div className="barra barra--ingreso" style={{ "--alto": alto(m.ingresos) }} />
                <div className="barra barra--gasto" style={{ "--alto": alto(m.gastos) }} />
              </div>
              <span className="texto-tenue">{m.mes}</span>
            </div>
          ))}
        </div>
        <table className="tabla">
          <caption className="visualmente-oculto">Ingresos y gastos por mes</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Ingresos</th>
              <th scope="col">Gastos</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.mes}>
                <th scope="row">{m.mes}</th>
                <td className="es-ingreso">{fmtMoney(m.ingresos)}</td>
                <td>{fmtMoney(m.gastos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card" aria-labelledby="titulo-ultimo-mes">
        <h2 className="card-kicker" id="titulo-ultimo-mes">
          Último mes
        </h2>
        <div className="grid-cards">
          <div>
            <div className="texto-tenue">Ingresos</div>
            <div className="monto-medio es-ingreso">{fmtMoney(ultimo.ingresos)}</div>
          </div>
          <div>
            <div className="texto-tenue">Gastos</div>
            <div className="monto-medio">{fmtMoney(ultimo.gastos)}</div>
          </div>
          <div>
            <div className="texto-tenue">{ahorro >= 0 ? "Ahorraste" : "Gastaste de más"}</div>
            <div className={"monto-medio" + (ahorro < 0 ? " es-negativo" : "")}>{fmtMoney(Math.abs(ahorro))}</div>
          </div>
        </div>
      </section>
    </>
  );
}

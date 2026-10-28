import { useMemo, useState } from "react";
import { getGastos } from "../api";
import { fmtMoney, iconoPorCategoria } from "../format";
import { useSeccion } from "../hooks";
import {
  colorDeCategoria,
  datosDelMes,
  diaCorto,
  diasParaMeses,
  gastadoHastaElDia,
  gastosDelMes,
  mesesDeTendencia,
  porCategoria,
  DONA,
  segmentosDona,
  variacion,
} from "../reportes";
import { Cargando, ErrorEstado, Skeleton, SkeletonFilas, Vacio } from "./Estado";

const MESES_A_VER = 6;
// Colores de categoría oscuros (--cat-1 azul, --cat-4 violeta): el ícono va
// en blanco para que se lea; en el resto, en azul noche.
const TINTA_CLARA = new Set([1, 4]);
const pct = (n) => `${Math.round(Math.abs(n) * 100)}%`;

export default function ReportesTab({ tendencia, monedaPorCuenta = {}, cotizaciones = {}, onNuevo }) {
  const meses = useMemo(() => mesesDeTendencia(tendencia.data), [tendencia.data]);
  const [elegido, setElegido] = useState(null);

  // Los gastos sueltos se piden recién al entrar a Reportes, y otra vez
  // cuando la tendencia se recarga después de guardar algo.
  const gastos = useSeccion(
    () => (tendencia.data ? getGastos(diasParaMeses(meses.length || MESES_A_VER)) : Promise.resolve(null)),
    [tendencia.data],
  );

  if (tendencia.cargando) {
    return (
      <Cargando texto="Cargando el análisis…">
        <div className="card reporte">
          <Skeleton ancho="50%" />
          <span className="skeleton reporte-dona-skeleton" aria-hidden="true" />
          <Skeleton ancho="70%" />
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
  if (!meses.some((m) => m.ingresos > 0 || m.gastos > 0)) {
    return (
      <div className="card">
        <Vacio icono="ph ph-chart-donut" texto="Todavía no hay nada para analizar. Cuando cargues gastos, acá vas a ver en qué se te va la plata cada mes.">
          <button type="button" className="btn btn-secondary" onClick={onNuevo}>
            <i className="ph ph-plus" aria-hidden="true" />
            Cargar un movimiento
          </button>
        </Vacio>
      </div>
    );
  }

  const idx = Math.max(0, elegido ? meses.findIndex((m) => m.clave === elegido) : meses.length - 1);
  const mes = meses[idx];
  const anterior = idx > 0 ? meses[idx - 1] : null;
  const anio = mes.anio !== new Date().getFullYear() ? ` ${mes.anio}` : "";

  return (
    <div className="reportes">
      <section className="card reporte" aria-labelledby="titulo-analisis" aria-busy={gastos.actualizando || tendencia.actualizando || undefined}>
        <div className="reporte-nav">
          <button type="button" className="btn-icono" onClick={() => setElegido(meses[idx - 1].clave)} disabled={idx === 0} aria-label="Mes anterior">
            <i className="ph ph-caret-left" aria-hidden="true" />
          </button>
          <h2 className="reporte-titulo" id="titulo-analisis" aria-live="polite">
            Análisis de {mes.nombre}{anio}
          </h2>
          <button
            type="button"
            className="btn-icono"
            onClick={() => setElegido(meses[idx + 1].clave)}
            disabled={idx === meses.length - 1}
            aria-label="Mes siguiente"
          >
            <i className="ph ph-caret-right" aria-hidden="true" />
          </button>
        </div>
        <Categorias key={mes.clave} mes={mes} anterior={anterior} gastos={gastos} monedaPorCuenta={monedaPorCuenta} cotizaciones={cotizaciones} onNuevo={onNuevo} />
      </section>

      <MasDatos mes={mes} anterior={anterior} gastos={gastos} monedaPorCuenta={monedaPorCuenta} cotizaciones={cotizaciones} />
    </div>
  );
}

// --- Dona por categoría (estilo Mercado Pago) + las dos que más pesaron ---

function Categorias({ mes, anterior, gastos, monedaPorCuenta, cotizaciones, onNuevo }) {
  const [verTodas, setVerTodas] = useState(false);
  const lista = useMemo(
    () => (gastos.data ? porCategoria(gastosDelMes(gastos.data, mes.clave, monedaPorCuenta, cotizaciones)) : null),
    [gastos.data, mes.clave, monedaPorCuenta, cotizaciones],
  );

  if (gastos.cargando || (!gastos.data && !gastos.error)) {
    return (
      <Cargando texto="Cargando gastos por categoría…">
        <span className="skeleton reporte-dona-skeleton" aria-hidden="true" />
        <SkeletonFilas cantidad={2} />
      </Cargando>
    );
  }
  if (gastos.error && !gastos.data) return <ErrorEstado mensaje={gastos.error} onReintentar={gastos.recargar} />;
  if (lista.length === 0) {
    return (
      <Vacio icono="ph ph-chart-donut" texto={`No hay gastos cargados en ${mes.nombre}.`}>
        {mes.actual && (
          <button type="button" className="btn btn-secondary" onClick={onNuevo}>
            <i className="ph ph-plus" aria-hidden="true" />
            Cargar un gasto
          </button>
        )}
      </Vacio>
    );
  }

  const total = lista.reduce((s, c) => s + c.total, 0);
  const segmentos = segmentosDona(lista);
  const comparacion = textoComparacion(mes, anterior, gastos.data, monedaPorCuenta, cotizaciones);

  return (
    <>
      <div className="reporte-dona">
        <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
          {segmentos.map((s, i) => (
            <path
              key={s.categoria}
              className="reporte-dona-tramo"
              d={s.d}
              fillRule="evenodd"
              strokeWidth={DONA.esquina * 2}
              style={{ "--cat-color": s.otros ? "var(--color-gasto)" : colorDeCategoria(s.categoria), "--orden": i }}
            />
          ))}
        </svg>
        {segmentos
          .filter((s) => s.conIcono)
          .map((s) => (
            <span
              key={s.categoria}
              className={"reporte-dona-icono" + (TINTA_CLARA.has(s.indice) ? " reporte-dona-icono--claro" : "")}
              style={{ "--x": `${s.x}%`, "--y": `${s.y}%` }}
              aria-hidden="true"
            >
              <i className={iconoPorCategoria(s.categoria)} />
            </span>
          ))}
        <div className="reporte-dona-centro">
          <span className="reporte-dona-total">{fmtMoney(total)}</span>
          <span className="texto-tenue texto-chico">{mes.actual ? "gastado hasta hoy" : "gastado"}</span>
        </div>
      </div>

      {comparacion && (
        <p className={"reporte-comparacion reporte-comparacion--" + comparacion.tono}>
          <i className={comparacion.icono} aria-hidden="true" />
          {comparacion.texto}
        </p>
      )}

      <ul className="lista reporte-top" aria-label="Las categorías donde más gastaste">
        {lista.slice(0, 2).map((c) => (
          <li key={c.categoria}>
            <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(c.categoria) }} aria-hidden="true">
              <i className={iconoPorCategoria(c.categoria)} />
            </span>
            <strong>{fmtMoney(c.total)}</strong>
            <span className="texto-tenue">{c.categoria}</span>
          </li>
        ))}
      </ul>

      {lista.length > 2 && (
        <>
          <button type="button" className="reporte-ver-todas" onClick={() => setVerTodas((x) => !x)} aria-expanded={verTodas} aria-controls="reporte-todas">
            {verTodas ? "Ocultar categorías" : `Ver las ${lista.length} categorías`}
            <i className={verTodas ? "ph ph-caret-up" : "ph ph-caret-down"} aria-hidden="true" />
          </button>
          {verTodas && (
            <ul className="lista reporte-todas" id="reporte-todas">
              {lista.map((c) => (
                <li key={c.categoria}>
                  <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(c.categoria) }} aria-hidden="true">
                    <i className={iconoPorCategoria(c.categoria)} />
                  </span>
                  <span className="reporte-todas-nombre">
                    {c.categoria}
                    <span className="texto-chico texto-tenue">
                      {pct(c.pct)} · {c.cantidad} {c.cantidad === 1 ? "gasto" : "gastos"}
                    </span>
                  </span>
                  <strong>{fmtMoney(c.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

// "12% menos que en septiembre". En el mes en curso compara con el anterior
// hasta el mismo día, para no comparar medio mes con uno entero.
function textoComparacion(mes, anterior, gastos, monedaPorCuenta, cotizaciones) {
  if (!anterior || !anterior.gastos) return null;
  let antes = anterior.gastos;
  let actual = mes.gastos;
  if (mes.actual) {
    const hoy = new Date().getDate();
    antes = gastadoHastaElDia(gastosDelMes(gastos, anterior.clave, monedaPorCuenta, cotizaciones), hoy);
    actual = gastadoHastaElDia(gastosDelMes(gastos, mes.clave, monedaPorCuenta, cotizaciones), hoy);
  }
  const v = variacion(actual, antes);
  if (v === null) return null;
  const cola = mes.actual ? `que ${anterior.nombre} a esta altura` : `que en ${anterior.nombre}`;
  if (Math.abs(v) < 0.03) return { tono: "igual", icono: "ph ph-equals", texto: `Casi lo mismo ${cola}` };
  if (v < 0) return { tono: "bien", icono: "ph ph-trend-down", texto: `${pct(v)} menos ${cola}` };
  return { tono: "mal", icono: "ph ph-trend-up", texto: `${pct(v)} más ${cola}` };
}

// --- El resto de los números, plegado ---

function MasDatos({ mes, anterior, gastos, monedaPorCuenta, cotizaciones }) {
  const datos = useMemo(
    () => (gastos.data ? datosDelMes(gastosDelMes(gastos.data, mes.clave, monedaPorCuenta, cotizaciones), mes.clave) : null),
    [gastos.data, mes.clave, monedaPorCuenta, cotizaciones],
  );
  const sobro = mes.ahorro >= 0;
  const parte = mes.ingresos > 0 ? pct(mes.ahorro / mes.ingresos) : null;

  return (
    <details className="card reporte-mas">
      <summary>
        <span>Más números de {mes.nombre}</span>
        <i className="ph ph-caret-down" aria-hidden="true" />
      </summary>
      <dl className="reporte-filas">
        <div>
          <dt>Entró</dt>
          <dd className="es-ingreso">{fmtMoney(mes.ingresos)}</dd>
        </div>
        <div>
          <dt>Salió</dt>
          <dd>{fmtMoney(mes.gastos)}</dd>
        </div>
        <div>
          <dt>{sobro ? "Te sobró" : "Gastaste de más"}</dt>
          <dd className={sobro ? "" : "es-negativo"}>
            {fmtMoney(Math.abs(mes.ahorro))}
            {parte && sobro && <span className="texto-tenue texto-chico"> · {parte} de lo que entró</span>}
          </dd>
        </div>
        {datos && datos.cantidad > 0 && (
          <>
            <div>
              <dt>Por día, en promedio</dt>
              <dd>{fmtMoney(datos.promedioDiario)}</dd>
            </div>
            {datos.diaPico && (
              <div>
                <dt>El día que más gastaste</dt>
                <dd>
                  {fmtMoney(datos.diaPico.total)}
                  <span className="texto-tenue texto-chico"> · {diaCorto(datos.diaPico.fecha)}</span>
                </dd>
              </div>
            )}
            {datos.masGrande && (
              <div>
                <dt>El gasto más grande</dt>
                <dd>
                  {fmtMoney(datos.masGrande.enPesos)}
                  <span className="texto-tenue texto-chico"> · {datos.masGrande.descripcion || datos.masGrande.categoria}</span>
                </dd>
              </div>
            )}
          </>
        )}
        {anterior && (
          <div>
            <dt>En {anterior.nombre} salió</dt>
            <dd>{fmtMoney(anterior.gastos)}</dd>
          </div>
        )}
      </dl>
      {datos?.hayOtraMoneda && (
        <p className="aviso-inline">
          <i className="ph ph-info" aria-hidden="true" />
          Algunos gastos en otra moneda no se sumaron porque falta su cotización.
        </p>
      )}
    </details>
  );
}

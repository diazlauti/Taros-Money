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
  variacion,
} from "../reportes";
import { Cargando, ErrorEstado, Skeleton, SkeletonFilas, Vacio } from "./Estado";

const CATEGORIAS_VISIBLES = 5;
const pct = (n) => `${Math.round(Math.abs(n) * 100)}%`;
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export default function ReportesTab({ tendencia, monedaPorCuenta = {}, cotizaciones = {}, onNuevo }) {
  const meses = useMemo(() => mesesDeTendencia(tendencia.data), [tendencia.data]);
  const [elegido, setElegido] = useState(null);

  // Los gastos sueltos (para categorías y datos del mes) se piden recién al
  // entrar a Reportes, y otra vez cuando la tendencia se recarga después de
  // guardar algo, así no queda desfasado.
  const gastos = useSeccion(
    () => (tendencia.data ? getGastos(diasParaMeses(meses.length || 6)) : Promise.resolve(null)),
    [tendencia.data],
  );

  if (tendencia.cargando) {
    return (
      <Cargando texto="Cargando reportes…">
        <div className="reportes">
          <div className="card">
            <Skeleton ancho="50%" />
            <Skeleton variante="monto" />
            <Skeleton ancho="80%" />
          </div>
          <div className="card">
            <Skeleton ancho="40%" />
            <Skeleton variante="chart" />
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
  const hayAlgo = meses.some((m) => m.ingresos > 0 || m.gastos > 0);
  if (!hayAlgo) {
    return (
      <div className="card">
        <Vacio icono="ph ph-chart-bar" texto="Todavía no hay nada para mostrar. Cuando cargues gastos e ingresos, acá vas a ver cómo te fue cada mes y en qué se te va la plata.">
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

  return (
    <div className="reportes" aria-busy={tendencia.actualizando || undefined}>
      <ResumenMes
        mes={mes}
        anterior={anterior}
        gastos={gastos.data}
        monedaPorCuenta={monedaPorCuenta}
        cotizaciones={cotizaciones}
        puedeAnterior={idx > 0}
        puedeSiguiente={idx < meses.length - 1}
        onAnterior={() => setElegido(meses[idx - 1].clave)}
        onSiguiente={() => setElegido(meses[idx + 1].clave)}
      />
      <GraficoMeses meses={meses} elegido={mes.clave} onElegir={setElegido} />
      <CategoriasMes
        key={mes.clave}
        mes={mes}
        anterior={anterior}
        gastos={gastos}
        monedaPorCuenta={monedaPorCuenta}
        cotizaciones={cotizaciones}
        onNuevo={onNuevo}
      />
      <DatosMes mes={mes} gastos={gastos} monedaPorCuenta={monedaPorCuenta} cotizaciones={cotizaciones} />
    </div>
  );
}

// --- Tarjeta principal: cuánto sobró en el mes elegido ---

function ResumenMes({ mes, anterior, gastos, monedaPorCuenta, cotizaciones, puedeAnterior, puedeSiguiente, onAnterior, onSiguiente }) {
  const sobro = mes.ahorro >= 0;
  const parteAhorrada = mes.ingresos > 0 ? Math.max(0, mes.ahorro) / mes.ingresos : 0;
  const comparacion = textoComparacion(mes, anterior, gastos, monedaPorCuenta, cotizaciones);

  return (
    <section className="card reporte-mes" aria-labelledby="titulo-reporte-mes">
      <div className="reporte-mes-nav">
        <button type="button" className="btn-icono" onClick={onAnterior} disabled={!puedeAnterior} aria-label="Mes anterior">
          <i className="ph ph-caret-left" aria-hidden="true" />
        </button>
        <h2 className="reporte-mes-titulo" id="titulo-reporte-mes" aria-live="polite">
          {mayuscula(mes.nombre)} {mes.anio}
          {mes.actual && <span className="tag">En curso</span>}
        </h2>
        <button type="button" className="btn-icono" onClick={onSiguiente} disabled={!puedeSiguiente} aria-label="Mes siguiente">
          <i className="ph ph-caret-right" aria-hidden="true" />
        </button>
      </div>

      <div className="reporte-mes-principal">
        <p className="texto-tenue reporte-mes-etiqueta">
          {mes.ingresos === 0 && mes.gastos > 0 ? "Gastaste" : sobro ? (mes.actual ? "Te va sobrando" : "Te sobró") : "Gastaste de más"}
        </p>
        <p className={"monto-grande" + (sobro ? "" : " es-negativo")}>
          {fmtMoney(mes.ingresos === 0 && mes.gastos > 0 ? mes.gastos : Math.abs(mes.ahorro))}
        </p>
      </div>

      <div className="reporte-mes-par">
        <div className="reporte-dato reporte-dato--ingreso">
          <i className="ph ph-arrow-down-left" aria-hidden="true" />
          <span>
            <span className="texto-tenue">Entró</span>
            <strong className="es-ingreso">{fmtMoney(mes.ingresos)}</strong>
          </span>
        </div>
        <div className="reporte-dato reporte-dato--gasto">
          <i className="ph ph-arrow-up-right" aria-hidden="true" />
          <span>
            <span className="texto-tenue">Salió</span>
            <strong>{fmtMoney(mes.gastos)}</strong>
          </span>
        </div>
      </div>

      {mes.ingresos > 0 && (
        <div className="pila-chica">
          <div
            className="progreso-pista"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(parteAhorrada * 100)}
            aria-label="Parte de lo que entró que te quedó"
          >
            <div className={"progreso-relleno reporte-ahorro-relleno" + (sobro ? "" : " reporte-ahorro-relleno--mal")} style={{ "--pct": sobro ? pct(parteAhorrada) : "100%" }} />
          </div>
          <p className="texto-tenue">
            {sobro
              ? `Te quedó el ${pct(parteAhorrada)} de lo que entró.`
              : `Saliste ${pct(-mes.ahorro / mes.ingresos)} por encima de lo que entró.`}
          </p>
        </div>
      )}

      {comparacion && (
        <p className={"reporte-comparacion reporte-comparacion--" + comparacion.tono}>
          <i className={comparacion.icono} aria-hidden="true" />
          {comparacion.texto}
        </p>
      )}
    </section>
  );
}

// "Gastaste 12% menos que en septiembre". En el mes en curso compara con el
// anterior hasta el mismo día, para no comparar medio mes con uno entero.
function textoComparacion(mes, anterior, gastos, monedaPorCuenta, cotizaciones) {
  if (!anterior || !anterior.gastos) return null;
  let actual = mes.gastos;
  let antes = anterior.gastos;
  let cola = `que en ${anterior.nombre}`;
  if (mes.actual) {
    if (!gastos) return null;
    const hoy = new Date().getDate();
    antes = gastadoHastaElDia(gastosDelMes(gastos, anterior.clave, monedaPorCuenta, cotizaciones), hoy);
    if (!antes) return null;
    cola = `que en ${anterior.nombre} a esta altura`;
  }
  const v = variacion(actual, antes);
  if (v === null) return null;
  const verbo = mes.actual ? "Vas gastando" : "Gastaste";
  if (Math.abs(v) < 0.03) return { tono: "igual", icono: "ph ph-equals", texto: `${verbo} casi lo mismo ${cola}.` };
  if (v < 0) return { tono: "bien", icono: "ph ph-trend-down", texto: `${verbo} ${pct(v)} menos ${cola}.` };
  return { tono: "mal", icono: "ph ph-trend-up", texto: `${verbo} ${pct(v)} más ${cola}.` };
}

// --- Gráfico de barras: cada mes se puede tocar para verlo ---

function GraficoMeses({ meses, elegido, onElegir }) {
  const maxVal = Math.max(...meses.map((m) => Math.max(m.ingresos, m.gastos)), 1);
  const alto = (valor) => `${Math.round((valor / maxVal) * 100)}%`;
  const cerrados = meses.filter((m) => !m.actual && m.gastos > 0);
  const promedio = cerrados.length ? cerrados.reduce((s, m) => s + m.gastos, 0) / cerrados.length : 0;

  return (
    <section className="card" aria-labelledby="titulo-tendencia">
      <div className="fila-separada">
        <h2 className="card-kicker" id="titulo-tendencia">
          Últimos {meses.length} meses
        </h2>
        <ul className="lista fila reporte-leyenda" aria-label="Referencias">
          <li className="leyenda-item">
            <span className="punto punto--ingreso" />
            Entró
          </li>
          <li className="leyenda-item">
            <span className="punto punto--gasto" />
            Salió
          </li>
        </ul>
      </div>

      <div className="reporte-barras" role="group" aria-label="Elegí un mes para verlo">
        {meses.map((m) => (
          <button
            key={m.clave}
            type="button"
            className={"reporte-barras-mes" + (m.clave === elegido ? " es-elegido" : "")}
            aria-pressed={m.clave === elegido}
            aria-label={`${mayuscula(m.nombre)}: entró ${fmtMoney(m.ingresos)}, salió ${fmtMoney(m.gastos)}`}
            onClick={() => onElegir(m.clave)}
          >
            <span className="reporte-barras-par" aria-hidden="true">
              <span className="barra barra--ingreso" style={{ "--alto": alto(m.ingresos) }} />
              <span className="barra barra--gasto" style={{ "--alto": alto(m.gastos) }} />
            </span>
            <span className="reporte-barras-nombre" aria-hidden="true">{m.corto}</span>
          </button>
        ))}
      </div>

      {promedio > 0 && (
        <p className="texto-tenue">
          En promedio salen <strong>{fmtMoney(promedio)}</strong> por mes (sin contar el que está en curso).
        </p>
      )}

      <details className="reporte-tabla">
        <summary>Ver los números</summary>
        <table className="tabla">
          <caption className="visualmente-oculto">Entradas, salidas y lo que sobró por mes</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Entró</th>
              <th scope="col">Salió</th>
              <th scope="col">Sobró</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.clave}>
                <th scope="row">{m.corto}</th>
                <td className="es-ingreso">{fmtMoney(m.ingresos)}</td>
                <td>{fmtMoney(m.gastos)}</td>
                <td className={m.ahorro < 0 ? "es-negativo" : ""}>{fmtMoney(m.ahorro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

// --- En qué se fue la plata del mes elegido ---

function CategoriasMes({ mes, anterior, gastos, monedaPorCuenta, cotizaciones, onNuevo }) {
  const [verTodas, setVerTodas] = useState(false);
  const titulo = (
    <h2 className="card-kicker" id="titulo-reporte-categorias">
      En qué se fue la plata en {mes.nombre}
    </h2>
  );

  const datos = useMemo(() => {
    if (!gastos.data) return null;
    const lista = porCategoria(gastosDelMes(gastos.data, mes.clave, monedaPorCuenta, cotizaciones));
    // Contra el mes anterior (en el mes en curso, hasta el mismo día).
    let antes = null;
    if (anterior) {
      let previos = gastosDelMes(gastos.data, anterior.clave, monedaPorCuenta, cotizaciones);
      if (mes.actual) {
        const hoy = new Date().getDate();
        previos = previos.filter((g) => Number(String(g.fecha).slice(8, 10)) <= hoy);
      }
      antes = Object.fromEntries(porCategoria(previos).map((c) => [c.categoria, c.total]));
    }
    return { lista, antes };
  }, [gastos.data, mes.clave, mes.actual, anterior, monedaPorCuenta, cotizaciones]);

  if (gastos.cargando || (!gastos.data && !gastos.error)) {
    return (
      <section className="card" aria-labelledby="titulo-reporte-categorias">
        {titulo}
        <Cargando texto="Cargando gastos por categoría…">
          <SkeletonFilas cantidad={4} />
        </Cargando>
      </section>
    );
  }
  if (gastos.error && !gastos.data) {
    return (
      <section className="card" aria-labelledby="titulo-reporte-categorias">
        {titulo}
        <ErrorEstado mensaje={gastos.error} onReintentar={gastos.recargar} />
      </section>
    );
  }
  if (datos.lista.length === 0) {
    return (
      <section className="card" aria-labelledby="titulo-reporte-categorias">
        {titulo}
        <Vacio icono="ph ph-receipt" texto={`No hay gastos cargados en ${mes.nombre}.`}>
          {mes.actual && (
            <button type="button" className="btn btn-secondary" onClick={onNuevo}>
              <i className="ph ph-plus" aria-hidden="true" />
              Cargar un gasto
            </button>
          )}
        </Vacio>
      </section>
    );
  }

  const max = datos.lista[0].total || 1;
  const visibles = verTodas ? datos.lista : datos.lista.slice(0, CATEGORIAS_VISIBLES);
  const ocultas = datos.lista.length - CATEGORIAS_VISIBLES;

  return (
    <section className="card" aria-labelledby="titulo-reporte-categorias" aria-busy={gastos.actualizando || undefined}>
      {titulo}
      <ul className="lista reporte-categorias">
        {visibles.map((c) => {
          const antes = datos.antes?.[c.categoria];
          const v = antes ? variacion(c.total, antes) : null;
          return (
            <li key={c.categoria} className="reporte-categoria" style={{ "--cat-color": colorDeCategoria(c.categoria) }}>
              <span className="reporte-icono" aria-hidden="true">
                <i className={iconoPorCategoria(c.categoria)} />
              </span>
              <span className="reporte-categoria-cuerpo">
                <span className="fila-separada">
                  <span className="reporte-categoria-nombre">{c.categoria}</span>
                  <strong>{fmtMoney(c.total)}</strong>
                </span>
                <span className="reporte-categoria-pista" aria-hidden="true">
                  <span className="reporte-categoria-relleno" style={{ "--pct": `${Math.max(2, Math.round((c.total / max) * 100))}%` }} />
                </span>
                <span className="fila-separada texto-chico texto-tenue">
                  <span>
                    {pct(c.pct)} del mes · {c.cantidad} {c.cantidad === 1 ? "gasto" : "gastos"}
                  </span>
                  {v !== null && Math.abs(v) >= 0.05 && (
                    <span className={"reporte-variacion" + (v > 0 ? " reporte-variacion--mas" : " reporte-variacion--menos")}>
                      <i className={v > 0 ? "ph ph-arrow-up" : "ph ph-arrow-down"} aria-hidden="true" />
                      <span className="visualmente-oculto">{v > 0 ? "Subió" : "Bajó"} </span>
                      {pct(v)}
                      <span className="visualmente-oculto"> contra {anterior.nombre}</span>
                    </span>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      {ocultas > 0 && (
        <button type="button" className="btn btn-texto reporte-ver-todas" onClick={() => setVerTodas((x) => !x)} aria-expanded={verTodas}>
          {verTodas ? "Ver menos" : `Ver las otras ${ocultas}`}
          <i className={verTodas ? "ph ph-caret-up" : "ph ph-caret-down"} aria-hidden="true" />
        </button>
      )}
      {anterior && <p className="texto-chico texto-tenue">Las flechas comparan con {anterior.nombre}{mes.actual ? " hasta el mismo día" : ""}.</p>}
    </section>
  );
}

// --- Datos sueltos del mes elegido ---

function DatosMes({ mes, gastos, monedaPorCuenta, cotizaciones }) {
  const datos = useMemo(
    () => (gastos.data ? datosDelMes(gastosDelMes(gastos.data, mes.clave, monedaPorCuenta, cotizaciones), mes.clave) : null),
    [gastos.data, mes.clave, monedaPorCuenta, cotizaciones],
  );
  // Sin gastos (o mientras carga / si falló) la tarjeta de categorías ya avisa.
  if (!datos || datos.cantidad === 0) return null;

  return (
    <section className="card" aria-labelledby="titulo-reporte-datos" aria-busy={gastos.actualizando || undefined}>
      <h2 className="card-kicker" id="titulo-reporte-datos">
        {mayuscula(mes.nombre)} en números
      </h2>
      <ul className="lista reporte-datos">
        <li className="reporte-tile">
          <i className="ph ph-calendar-blank" aria-hidden="true" />
          <span className="texto-tenue">Por día, en promedio</span>
          <strong>{fmtMoney(datos.promedioDiario)}</strong>
        </li>
        {datos.diaPico && (
          <li className="reporte-tile">
            <i className="ph ph-fire" aria-hidden="true" />
            <span className="texto-tenue">El día que más gastaste</span>
            <strong>{fmtMoney(datos.diaPico.total)}</strong>
            <span className="texto-chico texto-tenue">{mayuscula(diaCorto(datos.diaPico.fecha))}</span>
          </li>
        )}
        {datos.masGrande && (
          <li className="reporte-tile">
            <i className="ph ph-crown-simple" aria-hidden="true" />
            <span className="texto-tenue">El gasto más grande</span>
            <strong>{fmtMoney(datos.masGrande.enPesos)}</strong>
            <span className="texto-chico texto-tenue reporte-tile-detalle">
              {datos.masGrande.descripcion || datos.masGrande.categoria}
            </span>
          </li>
        )}
        <li className="reporte-tile">
          <i className="ph ph-receipt" aria-hidden="true" />
          <span className="texto-tenue">Gastos cargados</span>
          <strong>{datos.cantidad}</strong>
        </li>
      </ul>
      {datos.hayOtraMoneda && (
        <p className="texto-chico texto-tenue">Algunos gastos en otra moneda no se sumaron porque falta su cotización.</p>
      )}
    </section>
  );
}

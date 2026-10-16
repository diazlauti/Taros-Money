import { useMemo, useState } from "react";
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import { PERIODOS } from "../theme";
import Campo from "./Campo";
import EditarMovimientoDialog from "./EditarMovimientoDialog";
import { Cargando, ErrorEstado, SkeletonFilas, Vacio } from "./Estado";
import PeriodoSelector from "./PeriodoSelector";

export default function MovimientosTab({
  gastos,
  ingresos,
  categorias,
  cuentas,
  monedaPorCuenta,
  dias,
  onCambiarDias,
  onNuevo,
  onCambio,
  mailsActivos,
  revisandoMails,
  onRevisarMails,
  filtroInicial = "todos",
}) {
  const [filtro, setFiltro] = useState(filtroInicial);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);

  const combinados = useMemo(() => {
    const g = (gastos.data || []).map((x) => ({ ...x, tipo: "gasto" }));
    const i = (ingresos.data || []).map((x) => ({ ...x, tipo: "ingreso" }));
    return [...g, ...i].sort((a, b) =>
      `${b.fecha || ""} ${b.hora || ""}`.localeCompare(`${a.fecha || ""} ${a.hora || ""}`)
    );
  }, [gastos.data, ingresos.data]);

  const cantidadARevisar = combinados.filter((t) => t.aRevisar).length;
  // Si ya no queda nada por revisar, el filtro vuelve a "Todos".
  const filtroActivo = filtro === "revisar" && cantidadARevisar === 0 ? "todos" : filtro;

  const textoBusqueda = busqueda.trim().toLowerCase();
  const filtrados = combinados.filter((t) => {
    if (filtroActivo === "revisar" && !t.aRevisar) return false;
    if (filtroActivo !== "todos" && filtroActivo !== "revisar" && t.tipo !== filtroActivo) return false;
    if (!textoBusqueda) return true;
    const descripcion = (t.descripcion || "").toLowerCase();
    const categoria = (t.categoria || "").toLowerCase();
    return descripcion.includes(textoBusqueda) || categoria.includes(textoBusqueda);
  });

  const cargando = gastos.cargando || ingresos.cargando;
  const error = (gastos.error && !gastos.data) || (ingresos.error && !ingresos.data) ? gastos.error || ingresos.error : "";
  const periodoMasLargo = PERIODOS[PERIODOS.length - 1];

  let contenido;
  if (cargando) {
    contenido = (
      <Cargando texto="Cargando movimientos…">
        <SkeletonFilas cantidad={6} />
      </Cargando>
    );
  } else if (error) {
    contenido = (
      <ErrorEstado
        mensaje={error}
        onReintentar={() => {
          gastos.recargar();
          ingresos.recargar();
        }}
      />
    );
  } else if (filtrados.length === 0) {
    contenido = textoBusqueda ? (
      <Vacio icono="ph ph-magnifying-glass" texto={`No hay movimientos que coincidan con "${busqueda.trim()}".`}>
        <button type="button" className="btn btn-secondary" onClick={() => setBusqueda("")}>
          Borrar búsqueda
        </button>
      </Vacio>
    ) : (
      <Vacio texto={`No hay movimientos en los últimos ${dias} días.`}>
        {dias < periodoMasLargo && (
          <button type="button" className="btn btn-secondary" onClick={() => onCambiarDias(periodoMasLargo)}>
            Ver {periodoMasLargo} días
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={onNuevo}>
          <i className="ph ph-plus" aria-hidden="true" />
          Cargar un movimiento
        </button>
      </Vacio>
    );
  } else {
    contenido = (
      <>
        <p className="visualmente-oculto" aria-live="polite">
          {filtrados.length} movimientos
        </p>
        <ul className="lista">
          {filtrados.map((t, i) => {
            const monto = fmtMoney(t.monto, monedaPorCuenta[t.cuenta] || "ARS");
            const esIngreso = t.tipo === "ingreso";
            return (
              <li key={`${t.tipo}-${t.fecha}-${t.hora || ""}-${t.monto}-${i}`}>
                <button
                  type="button"
                  className="movimiento"
                  onClick={() => setEditando(t)}
                  aria-label={`${t.aRevisar ? "Revisar" : "Editar"} ${esIngreso ? "ingreso" : "gasto"}${t.aRevisar ? " detectado en tus mails" : ""}: ${t.descripcion || "sin descripción"}, ${esIngreso ? "más" : "menos"} ${monto}, ${fmtFecha(t.fecha)}`}
                >
                  <i className={iconoPorCategoria(t.categoria)} aria-hidden="true" />
                  <span className="movimiento-texto">
                    <span className="movimiento-desc">{t.descripcion || "Sin descripción"}</span>
                    <span className="texto-tenue texto-chico">
                      {t.categoria || "Sin categoría"} · {fmtFecha(t.fecha)}
                      {t.cuenta ? ` · ${t.cuenta}` : ""}
                    </span>
                    {t.aRevisar && (
                      <span className="tag tag-revisar">
                        <i className="ph ph-envelope-simple" aria-hidden="true" />A revisar
                      </span>
                    )}
                  </span>
                  <span className={"movimiento-monto" + (esIngreso ? " es-ingreso" : "")}>
                    {esIngreso ? "+" : "-"}
                    {monto}
                  </span>
                  <i className="ph ph-pencil-simple icono-editar" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  return (
    <>
      <PeriodoSelector dias={dias} onCambiar={onCambiarDias} />

      <div className="fila-separada">
        <div className="seg" role="radiogroup" aria-label="Mostrar">
          {[
            ["todos", "Todos"],
            ["ingreso", "Ingresos"],
            ["gasto", "Gastos"],
            ...(cantidadARevisar > 0 ? [["revisar", `A revisar (${cantidadARevisar})`]] : []),
          ].map(([valor, texto]) => (
            <label className="seg-opt" key={valor}>
              <input type="radio" name="filtro-mov" checked={filtroActivo === valor} onChange={() => setFiltro(valor)} />
              {texto}
            </label>
          ))}
        </div>
        {mailsActivos && (
          <button type="button" className="btn btn-secondary" onClick={onRevisarMails} disabled={revisandoMails}>
            <i className="ph ph-envelope-simple" aria-hidden="true" />
            {revisandoMails ? "Revisando mails…" : "Revisar mails"}
          </button>
        )}
      </div>

      <Campo etiqueta="Buscar">
        {(p) => (
          <input
            {...p}
            className="input"
            type="search"
            placeholder="Descripción o categoría"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        )}
      </Campo>

      <section className="card" aria-label="Movimientos" aria-busy={gastos.actualizando || ingresos.actualizando || undefined}>
        {contenido}
      </section>

      {editando && (
        <EditarMovimientoDialog
          movimiento={editando}
          tipo={editando.tipo}
          categorias={categorias}
          cuentas={cuentas}
          monedaPorCuenta={monedaPorCuenta}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}
    </>
  );
}

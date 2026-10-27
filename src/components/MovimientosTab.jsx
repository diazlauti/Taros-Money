import { useId, useMemo, useState } from "react";
import { confirmarTodosLosDeMails } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { playError, playSuccess } from "../sounds";
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import {
  ORDENES,
  RANGOS,
  RANGO_LOCAL,
  agruparPorDia,
  categoriasPresentes,
  colorDeCategoria,
  desdeHaceDias,
  horaCorta,
  nombreDia,
  ordenar,
  saldosPorDia,
} from "../movimientos";
import { PERIODOS } from "../theme";
import Campo from "./Campo";
import Dialog from "./Dialog";
import EditarMovimientoDialog from "./EditarMovimientoDialog";
import { Cargando, ErrorEstado, SkeletonFilas, Vacio } from "./Estado";

const SIN_CATEGORIA = "Sin categoría";

export default function MovimientosTab({
  gastos,
  ingresos,
  categorias,
  cuentas,
  monedaPorCuenta,
  cotizaciones,
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
  const [categoriasElegidas, setCategoriasElegidas] = useState([]);
  const [rangoLocal, setRangoLocal] = useState(null);
  const [orden, setOrden] = useState("recientes");
  const [viendoFiltros, setViendoFiltros] = useState(false);
  const [editando, setEditando] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmar, setErrorConfirmar] = useState("");
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const idOrden = useId();

  const combinados = useMemo(() => {
    const g = (gastos.data || []).map((x) => ({ ...x, tipo: "gasto" }));
    const i = (ingresos.data || []).map((x) => ({ ...x, tipo: "ingreso" }));
    return [...g, ...i];
  }, [gastos.data, ingresos.data]);

  // "3 días" se recorta acá; el resto ya viene recortado del backend.
  const rangoActivo = rangoLocal ?? dias;
  const enRango = useMemo(() => {
    if (!rangoLocal) return combinados;
    const desde = desdeHaceDias(rangoLocal);
    return combinados.filter((t) => (t.fecha || "") >= desde);
  }, [combinados, rangoLocal]);

  const cantidadARevisar = combinados.filter((t) => t.aRevisar).length;
  // Si ya no queda nada por revisar, el filtro vuelve a "Todos".
  const filtroActivo = filtro === "revisar" && cantidadARevisar === 0 ? "todos" : filtro;

  const textoBusqueda = busqueda.trim().toLowerCase();
  const pasaTipoYBusqueda = (t) => {
    if (filtroActivo === "revisar" && !t.aRevisar) return false;
    if (filtroActivo !== "todos" && filtroActivo !== "revisar" && t.tipo !== filtroActivo) return false;
    if (!textoBusqueda) return true;
    const descripcion = (t.descripcion || "").toLowerCase();
    const categoria = (t.categoria || "").toLowerCase();
    return descripcion.includes(textoBusqueda) || categoria.includes(textoBusqueda);
  };
  const antesDeCategoria = enRango.filter(pasaTipoYBusqueda);
  // Los chips muestran las categorías que hay con los otros filtros puestos,
  // más las elegidas (para poder sacarlas aunque ya no tengan nada).
  const categoriasChips = [
    ...categoriasPresentes(antesDeCategoria),
    ...categoriasElegidas.filter((c) => !antesDeCategoria.some((t) => (t.categoria || SIN_CATEGORIA) === c)),
  ];
  const filtrados = ordenar(
    categoriasElegidas.length
      ? antesDeCategoria.filter((t) => categoriasElegidas.includes(t.categoria || SIN_CATEGORIA))
      : antesDeCategoria,
    orden,
    monedaPorCuenta,
    cotizaciones
  );
  const porFecha = orden === "recientes" || orden === "antiguos";
  // Con todos los movimientos que vinieron (no solo los filtrados): el saldo
  // de un día depende de todo lo que pasó después.
  const saldos = useMemo(
    () => saldosPorDia(combinados, cuentas, monedaPorCuenta, cotizaciones),
    [combinados, cuentas, monedaPorCuenta, cotizaciones]
  );

  // Cuántos filtros hay puestos (para el número del botón «Filtros»).
  const cantidadFiltros =
    (filtroActivo !== "todos" ? 1 : 0) + categoriasElegidas.length + (orden !== "recientes" ? 1 : 0) + (rangoLocal ? 1 : 0);

  function limpiarFiltros() {
    setFiltro("todos");
    setBusqueda("");
    setCategoriasElegidas([]);
    setOrden("recientes");
    setRangoLocal(null);
  }

  function alternarCategoria(c) {
    setCategoriasElegidas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function elegirRango(r) {
    if (r === RANGO_LOCAL) {
      setRangoLocal(RANGO_LOCAL);
      // El backend trae como mínimo 7 días: con eso alcanza para recortar 3.
      if (dias < RANGO_LOCAL) onCambiarDias(PERIODOS[0]);
      return;
    }
    setRangoLocal(null);
    if (r !== dias) onCambiarDias(r);
  }

  async function confirmarTodos() {
    const sinConfirmar = combinados.filter((t) => t.sinConfirmar && !t.sinMonto).length;
    const sinMonto = combinados.filter((t) => t.sinMonto).length;
    const aclaracion =
      (sinConfirmar > 0 ? ` ${sinConfirmar} sin confirmar se suman a tus gastos.` : "") +
      (sinMonto > 0 ? ` ${sinMonto === 1 ? "El que no tiene monto queda" : `Los ${sinMonto} sin monto quedan`} para que ${sinMonto === 1 ? "lo" : "los"} completes.` : "");
    if (!(await confirmar({ titulo: `¿Confirmar los ${cantidadARevisar} movimientos tal como están?`, texto: aclaracion.trim(), si: "Confirmar todos" }))) return;
    setConfirmando(true);
    setErrorConfirmar("");
    try {
      const { confirmados, sinMonto: faltan = 0 } = await confirmarTodosLosDeMails();
      playSuccess();
      avisar(
        (confirmados === 1 ? "1 movimiento confirmado" : `${confirmados} movimientos confirmados`) +
          (faltan > 0 ? `. ${faltan === 1 ? "Falta el monto de 1" : `Falta el monto de ${faltan}`}.` : "")
      );
      setFiltro("todos");
      onCambio?.();
    } catch (err) {
      playError();
      setErrorConfirmar(err.message || "No se pudieron confirmar. Probá de nuevo.");
    } finally {
      setConfirmando(false);
    }
  }

  const cargando = gastos.cargando || ingresos.cargando;
  const error = (gastos.error && !gastos.data) || (ingresos.error && !ingresos.data) ? gastos.error || ingresos.error : "";
  const periodoMasLargo = RANGOS[RANGOS.length - 1];

  function fila(t, esPrimera, conFecha) {
    // Gastos de mails sin confirmar: en la moneda del mail (Steam cobra en
    // dólares); sin monto si el mail no decía el precio.
    const monto = t.sinMonto ? "sin monto" : fmtMoney(t.monto, t.moneda || monedaPorCuenta[t.cuenta] || "ARS");
    const esIngreso = t.tipo === "ingreso";
    const hora = horaCorta(t.hora);
    const categoria = t.categoria || SIN_CATEGORIA;
    const cuando = conFecha ? [fmtFecha(t.fecha), hora].filter(Boolean).join(" · ") : hora;
    return (
      <button
        type="button"
        className="movimiento mov-fila"
        data-tour={esPrimera ? "primer-movimiento" : undefined}
        onClick={() => setEditando(t)}
        aria-label={`${t.aRevisar ? "Revisar" : "Editar"} ${esIngreso ? "ingreso" : "gasto"}${t.aRevisar ? " detectado en tus mails" : ""}: ${t.descripcion || "sin descripción"}, ${categoria}, ${esIngreso ? "más" : "menos"} ${monto}, ${fmtFecha(t.fecha)}${hora ? ` a las ${hora}` : ""}`}
      >
        <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(categoria) }} aria-hidden="true">
          <i className={iconoPorCategoria(t.categoria)} />
        </span>
        <span className="movimiento-texto">
          <span className="movimiento-desc">{t.descripcion || "Sin descripción"}</span>
          <span className="texto-tenue texto-chico mov-detalle">
            {categoria}
            {t.cuenta ? ` · ${t.cuenta}` : ""}
          </span>
          {t.aRevisar && (
            <span className="tag tag-revisar">
              <i className="ph ph-envelope-simple" aria-hidden="true" />
              {t.sinConfirmar ? "Sin confirmar" : "A revisar"}
            </span>
          )}
        </span>
        <span className="mov-derecha">
          {t.sinMonto ? (
            <span className="pendiente-sin-monto">Sin monto</span>
          ) : (
            <span className={"movimiento-monto" + (esIngreso ? " es-ingreso" : "")}>
              {esIngreso ? "+" : "-"}
              {monto}
            </span>
          )}
          {cuando && <span className="texto-tenue texto-chico">{cuando}</span>}
        </span>
      </button>
    );
  }

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
    contenido =
      textoBusqueda || categoriasElegidas.length || filtroActivo !== "todos" ? (
        <Vacio
          icono="ph ph-funnel-x"
          texto={
            textoBusqueda
              ? `No hay movimientos que coincidan con "${busqueda.trim()}".`
              : "No hay movimientos con estos filtros."
          }
        >
          <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
            Sacar filtros
          </button>
        </Vacio>
      ) : (
        <Vacio texto={`No hay movimientos en los últimos ${rangoActivo} días.`}>
          {rangoActivo < periodoMasLargo && (
            <button type="button" className="btn btn-secondary" onClick={() => elegirRango(periodoMasLargo)}>
              Ver {periodoMasLargo} días
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onNuevo}>
            <i className="ph ph-plus" aria-hidden="true" />
            Cargar un movimiento
          </button>
        </Vacio>
      );
  } else if (porFecha) {
    contenido = (
      <div className="mov-dias">
        {agruparPorDia(filtrados).map((grupo, gi) => {
          const saldo = saldos?.[grupo.fecha];
          const idTitulo = `mov-dia-${grupo.fecha || "sin-fecha"}`;
          return (
            <section className="mov-dia" key={grupo.fecha || gi} aria-labelledby={idTitulo}>
              <header className="mov-dia-cabecera">
                <h3 className="mov-dia-titulo" id={idTitulo}>
                  {nombreDia(grupo.fecha)}
                </h3>
                {saldo !== undefined && (
                  <p className="mov-dia-saldo texto-tenue">Saldo del día {fmtMoney(saldo)}</p>
                )}
              </header>
              <ul className="lista">
                {grupo.movimientos.map((t, i) => (
                  <li key={`${t.tipo}-${t.fecha}-${t.hora || ""}-${t.monto}-${i}`}>{fila(t, gi === 0 && i === 0, false)}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  } else {
    contenido = (
      <ul className="lista">
        {filtrados.map((t, i) => (
          <li key={`${t.tipo}-${t.fecha}-${t.hora || ""}-${t.monto}-${i}`}>{fila(t, i === 0, true)}</li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <div className="mov-barra">
        <Campo etiqueta="Buscar">
          {(p) => (
            <span className="mov-buscar">
              <i className="ph ph-magnifying-glass" aria-hidden="true" />
              <input
                {...p}
                className="input"
                type="search"
                placeholder="Buscar"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </span>
          )}
        </Campo>
        <button
          type="button"
          className={"btn btn-secondary mov-btn-filtros" + (cantidadFiltros ? " mov-btn-filtros--activo" : "")}
          onClick={() => setViendoFiltros(true)}
          aria-haspopup="dialog"
          aria-label={cantidadFiltros ? `Filtros, ${cantidadFiltros} puestos` : "Filtros"}
        >
          <i className="ph ph-sliders-horizontal" aria-hidden="true" />
          Filtros
          {cantidadFiltros > 0 && (
            <span className="mov-filtros-cantidad" aria-hidden="true">
              {cantidadFiltros}
            </span>
          )}
        </button>
        {mailsActivos && (
          <button
            type="button"
            className="btn btn-secondary btn-encabezado"
            onClick={onRevisarMails}
            disabled={revisandoMails}
            aria-label={revisandoMails ? "Revisando mails…" : "Revisar mails"}
            title="Revisar mails"
          >
            <i className={revisandoMails ? "ph ph-spinner mov-girando" : "ph ph-envelope-simple"} aria-hidden="true" />
          </button>
        )}
      </div>

      {filtroActivo === "revisar" && (
        <div className="pila-chica">
          <button
            type="button"
            className="btn btn-primary btn-alinear-inicio"
            onClick={confirmarTodos}
            disabled={confirmando}
          >
            <i className="ph ph-checks" aria-hidden="true" />
            {confirmando ? "Confirmando…" : `Confirmar todos (${cantidadARevisar})`}
          </button>
          {errorConfirmar && (
            <p className="mensaje-error" role="alert">
              {errorConfirmar}
            </p>
          )}
        </div>
      )}

      <p className="visualmente-oculto" aria-live="polite">
        {!cargando && !error ? `${filtrados.length} movimientos` : ""}
      </p>

      <section className="card mov-card" aria-label="Movimientos" aria-busy={gastos.actualizando || ingresos.actualizando || undefined}>
        {contenido}
      </section>

      {viendoFiltros && (
        <Dialog titulo="Filtros" onClose={() => setViendoFiltros(false)}>
          <div className="mov-filtros">
            <fieldset className="field mov-grupo">
              <legend>Mostrar</legend>
              <div className="chips" role="radiogroup" aria-label="Mostrar">
                {[
                  ["todos", "Todos", "ph ph-list"],
                  ["gasto", "Gastos", "ph ph-arrow-up-right"],
                  ["ingreso", "Ingresos", "ph ph-arrow-down-left"],
                  ...(cantidadARevisar > 0 ? [["revisar", `A revisar (${cantidadARevisar})`, "ph ph-envelope-simple"]] : []),
                ].map(([valor, texto, icono]) => (
                  <label className="chip-radio" key={valor}>
                    <input type="radio" name="filtro-mov" checked={filtroActivo === valor} onChange={() => setFiltro(valor)} />
                    <i className={icono} aria-hidden="true" />
                    {texto}
                  </label>
                ))}
              </div>
            </fieldset>

            {categoriasChips.length > 0 && (
              <fieldset className="field mov-grupo">
                <legend>Categorías</legend>
                <div className="chips" role="group" aria-label="Categorías">
                  {categoriasChips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="chip chip-categoria"
                      aria-pressed={categoriasElegidas.includes(c)}
                      onClick={() => alternarCategoria(c)}
                      style={{ "--mov-color": colorDeCategoria(c) }}
                    >
                      <i className={iconoPorCategoria(c === SIN_CATEGORIA ? "" : c)} aria-hidden="true" />
                      {c}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="field mov-grupo">
              <legend>Período</legend>
              <div className="chips" role="group" aria-label="Período">
                {RANGOS.map((r) => (
                  <button key={r} type="button" className="chip" aria-pressed={rangoActivo === r} onClick={() => elegirRango(r)}>
                    {r} días
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor={idOrden}>Ordenar</label>
              <select id={idOrden} className="input" value={orden} onChange={(e) => setOrden(e.target.value)}>
                {ORDENES.map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
            </div>

            <div className="mov-filtros-acciones">
              {cantidadFiltros > 0 && (
                <button type="button" className="btn btn-secondary" onClick={limpiarFiltros}>
                  Sacar filtros
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setViendoFiltros(false)}>
                Ver {filtrados.length === 1 ? "1 movimiento" : `${filtrados.length} movimientos`}
              </button>
            </div>
          </div>
        </Dialog>
      )}

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

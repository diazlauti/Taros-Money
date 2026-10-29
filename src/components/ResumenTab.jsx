import { useEffect, useRef, useState } from "react";
import { aPesos, fmtMoney, fmtFecha, iconoPorCategoria, nombreMes } from "../format";
import RevisionMails from "./RevisionMails";
import { etiquetaEstado, serviciosConEstado, textoVencimiento } from "../servicios";
import { colorDeCategoria, nombreDia } from "../movimientos";
import {
  categoriasOrdenadas,
  guardarOcultarSaldo,
  leerOcultarSaldo,
  soloConfirmados,
  totalEnPesos,
  ultimosMovimientos,
} from "../resumen";
import { Cargando, ErrorEstado, Skeleton, SkeletonFilas, Vacio } from "./Estado";
import EditarMovimientoDialog from "./EditarMovimientoDialog";
import PeriodoSelector from "./PeriodoSelector";

// Cuántas categorías y movimientos se ven sin tocar «Ver más».
const CATEGORIAS_A_LA_VISTA = 4;
const MOVIMIENTOS_A_LA_VISTA = 4;
const SERVICIOS_A_LA_VISTA = 3;

// Resumen: arriba la tarjeta con tu plata, accesos rápidos, lo que tenés
// para hacer (servicios y mails), en qué se fue y los últimos movimientos.
export default function ResumenTab({
  saldo,
  resumen,
  gastos,
  ingresos,
  cuentas,
  servicios,
  categorias,
  cotizaciones,
  monedaPorCuenta,
  dias,
  onCambiarDias,
  onNuevo,
  onIrA,
  onCambioMovimientos,
  mails,
}) {
  return (
    <div className="resumen">
      <SaldoCard
        saldo={saldo}
        cuentas={cuentas}
        gastos={gastos}
        ingresos={ingresos}
        dias={dias}
        cotizaciones={cotizaciones}
        monedaPorCuenta={monedaPorCuenta}
        onIrA={onIrA}
      />
      <AccionesRapidas onNuevo={onNuevo} onIrA={onIrA} />
      <ParaHacer servicios={servicios} cotizaciones={cotizaciones} monedaPorCuenta={monedaPorCuenta} onIrA={onIrA} />
      {mails && <MailsCard {...mails} cuentas={cuentas.data} monedaPorCuenta={monedaPorCuenta} />}
      <CategoriasCard resumen={resumen} dias={dias} onCambiarDias={onCambiarDias} onNuevo={onNuevo} />
      <UltimosCard
        gastos={gastos}
        ingresos={ingresos}
        dias={dias}
        monedaPorCuenta={monedaPorCuenta}
        categorias={categorias}
        cuentas={cuentas.data}
        onNuevo={onNuevo}
        onIrA={onIrA}
        onCambio={onCambioMovimientos}
      />
    </div>
  );
}

// Título de cada bloque, afuera de la tarjeta (como en las apps de banco).
function Titulo({ id, children, accion }) {
  return (
    <div className="resumen-titulo">
      <h2 id={id}>{children}</h2>
      {accion}
    </div>
  );
}

function SaldoCard({ saldo, cuentas, gastos, ingresos, dias, cotizaciones, monedaPorCuenta, onIrA }) {
  const [oculto, setOculto] = useState(leerOcultarSaldo);
  const lista = cuentas.data || [];
  const hayCuentas = lista.length > 0;
  // El total es la suma de las cuentas (las de otras monedas pasadas a pesos
  // con la cotización de Configuración) en cuanto haya alguna; si no, el
  // saldo manual de la planilla. Sin cotización, esas cuentas quedan afuera.
  const faltaCotizacion = lista.some((c) => aPesos(c.saldo, c.moneda, cotizaciones) === null);
  const totalCuentasArs = lista.reduce((sum, c) => sum + (aPesos(c.saldo, c.moneda, cotizaciones) ?? 0), 0);
  const tapar = (texto) => (oculto ? "$ •••••" : texto);

  function alternar() {
    guardarOcultarSaldo(!oculto);
    setOculto(!oculto);
  }

  let contenido;
  if (cuentas.cargando || (!hayCuentas && saldo.cargando)) {
    contenido = (
      <Cargando texto="Cargando saldo…">
        <div className="pila-resumen">
          <Skeleton variante="monto" />
          <Skeleton ancho="80%" />
        </div>
      </Cargando>
    );
  } else if (!hayCuentas && saldo.error) {
    contenido = (
      <ErrorEstado
        mensaje={saldo.error}
        onReintentar={() => {
          saldo.recargar();
          cuentas.recargar();
        }}
      />
    );
  } else if (!hayCuentas && (saldo.data === null || saldo.data === undefined)) {
    contenido = (
      <div className="pila-resumen">
        <p>Agregá tus cuentas y acá ves cuánta plata tenés en total.</p>
        <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={() => onIrA("cuentas")}>
          <i className="ph ph-plus" aria-hidden="true" />
          Agregar una cuenta
        </button>
      </div>
    );
  } else {
    contenido = (
      <>
        <p className="saldo-total num" aria-live="polite">
          {oculto ? (
            <>
              <span aria-hidden="true">$ •••••</span>
              <span className="visualmente-oculto">Saldo oculto</span>
            </>
          ) : (
            <>
              <span aria-hidden="true">
                <NumeroQueSube valor={hayCuentas ? totalCuentasArs : saldo.data} />
              </span>
              <span className="visualmente-oculto">{fmtMoney(hayCuentas ? totalCuentasArs : saldo.data)}</span>
            </>
          )}
        </p>
        <EntroSalio gastos={gastos} ingresos={ingresos} dias={dias} cotizaciones={cotizaciones} monedaPorCuenta={monedaPorCuenta} tapar={tapar} />
        {hayCuentas && (
          <ul className="saldo-cuentas" aria-label="Tus cuentas">
            {lista.map((c) => (
              <li key={c.nombre}>
                <span>{c.nombre}</span>
                <span className="num">{tapar(fmtMoney(c.saldo, c.moneda))}</span>
              </li>
            ))}
          </ul>
        )}
        {faltaCotizacion && (
          <p className="saldo-aviso">
            <i className="ph ph-info" aria-hidden="true" />
            No suma las cuentas en otras monedas porque falta su cotización (Configuración › Monedas).
          </p>
        )}
      </>
    );
  }

  return (
    <section className="saldo-card resumen-area-saldo" aria-labelledby="titulo-saldo">
      <div className="saldo-cabeza">
        <h2 id="titulo-saldo">Tu plata hoy</h2>
        <button
          type="button"
          className="saldo-ojo"
          onClick={alternar}
          aria-pressed={oculto}
          aria-label={oculto ? "Mostrar montos" : "Ocultar montos"}
          title={oculto ? "Mostrar montos" : "Ocultar montos"}
        >
          <i className={oculto ? "ph ph-eye-slash" : "ph ph-eye"} aria-hidden="true" />
        </button>
      </div>
      {contenido}
    </section>
  );
}

// Lo que entró y salió en el período elegido abajo (7 a 90 días).
function EntroSalio({ gastos, ingresos, dias, cotizaciones, monedaPorCuenta, tapar }) {
  const cargando = gastos.cargando || ingresos.cargando;
  const valor = (estado) => {
    if (estado.error && !estado.data) return "—";
    return null;
  };
  const entro = valor(ingresos) ?? tapar(`+ ${fmtMoney(totalEnPesos(soloConfirmados(ingresos.data), monedaPorCuenta, cotizaciones))}`);
  const salio = valor(gastos) ?? tapar(`− ${fmtMoney(totalEnPesos(soloConfirmados(gastos.data), monedaPorCuenta, cotizaciones))}`);
  return (
    <dl className="saldo-mini">
      <div>
        <dt>Entró · {dias} días</dt>
        <dd className="num saldo-entro">{cargando ? <Skeleton ancho="70%" /> : entro}</dd>
      </div>
      <div>
        <dt>Salió · {dias} días</dt>
        <dd className="num saldo-salio">{cargando ? <Skeleton ancho="70%" /> : salio}</dd>
      </div>
    </dl>
  );
}

function AccionesRapidas({ onNuevo, onIrA }) {
  const acciones = [
    { id: "gasto", texto: "Gasto", icono: "ph ph-minus", onClick: () => onNuevo("gasto"), principal: true },
    { id: "ingreso", texto: "Ingreso", icono: "ph ph-plus", onClick: () => onNuevo("ingreso") },
    { id: "servicios", texto: "Servicios", icono: "ph ph-receipt", onClick: () => onIrA("servicios") },
    { id: "cuentas", texto: "Cuentas", icono: "ph ph-wallet", onClick: () => onIrA("cuentas") },
  ];
  return (
    <nav className="acciones-rapidas resumen-area-acciones" aria-label="Accesos rápidos">
      {acciones.map((a) => (
        <button
          key={a.id}
          type="button"
          className={"accion-rapida" + (a.principal ? " accion-rapida--principal" : "")}
          onClick={a.onClick}
        >
          <span className="accion-rapida-icono" aria-hidden="true">
            <i className={a.icono} />
          </span>
          {a.texto}
        </button>
      ))}
    </nav>
  );
}

// "Luz" o "Internet" pueden tener ícono propio; si no, el de su categoría o un recibo.
function iconoDeServicio(s) {
  const generico = iconoPorCategoria("");
  const porNombre = iconoPorCategoria(s.nombre);
  if (porNombre !== generico) return porNombre;
  const porCategoria = iconoPorCategoria(s.categoria);
  return porCategoria !== generico ? porCategoria : "ph ph-receipt";
}

// Los servicios del mes que faltan pagar, los más urgentes primero.
function ParaHacer({ servicios, cotizaciones, monedaPorCuenta, onIrA }) {
  const lista = serviciosConEstado(servicios.data);
  const pendientes = lista.filter((s) => s.estado !== "pagado");
  const enPesos = (s) => aPesos(s.monto, monedaPorCuenta[s.cuenta], cotizaciones) ?? 0;
  const faltaPagar = pendientes.reduce((sum, s) => sum + enPesos(s), 0);

  let contenido;
  if (servicios.cargando) {
    contenido = (
      <Cargando texto="Cargando servicios…">
        <SkeletonFilas cantidad={2} />
      </Cargando>
    );
  } else if (servicios.error && !servicios.data) {
    contenido = <ErrorEstado mensaje={servicios.error} onReintentar={servicios.recargar} />;
  } else if (lista.length === 0) {
    contenido = (
      <Vacio icono="ph ph-receipt" texto="Cargá la luz, el gas, internet o el alquiler y acá ves cuáles te faltan pagar.">
        <button type="button" className="btn btn-secondary" onClick={() => onIrA("servicios")}>
          <i className="ph ph-plus" aria-hidden="true" />
          Agregar servicios
        </button>
      </Vacio>
    );
  } else if (pendientes.length === 0) {
    contenido = (
      <p className="para-hacer-listo">
        <span className="resumen-icono resumen-icono--ok" aria-hidden="true">
          <i className="ph ph-check" />
        </span>
        Ya pagaste todos los servicios de {nombreMes()}.
      </p>
    );
  } else {
    contenido = (
      <>
        <ul className="lista resumen-lista">
          {pendientes.slice(0, SERVICIOS_A_LA_VISTA).map((s) => (
            <li key={s.nombre}>
              <button
                type="button"
                className="resumen-fila"
                onClick={() => onIrA("servicios")}
                aria-label={`Pagar ${s.nombre}, ${fmtMoney(s.monto, monedaPorCuenta[s.cuenta] || "ARS")}, ${textoVencimiento(s)}`}
              >
                <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(s.categoria || s.nombre) }} aria-hidden="true">
                  <i className={iconoDeServicio(s)} />
                </span>
                <span className="movimiento-texto">
                  <span className="movimiento-desc">{s.nombre}</span>
                </span>
                <span className="mov-derecha">
                  <span className="movimiento-monto num">{fmtMoney(s.monto, monedaPorCuenta[s.cuenta] || "ARS")}</span>
                  {s.estado === "pendiente" ? (
                    <span className="texto-tenue texto-chico">{etiquetaEstado(s)}</span>
                  ) : (
                    <span className={`tag tag-estado tag-estado--${s.estado}`}>{etiquetaEstado(s)}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="resumen-pie texto-tenue texto-chico">
          Falta <span className="num">{fmtMoney(faltaPagar)}</span>
        </p>
      </>
    );
  }

  return (
    <section aria-labelledby="titulo-para-hacer" className="resumen-bloque resumen-area-pagar">
      <Titulo
        id="titulo-para-hacer"
        accion={
          lista.length > 0 && (
            <button type="button" className="btn-link resumen-link" onClick={() => onIrA("servicios")}>
              Ver servicios
            </button>
          )
        }
      >
        Para pagar en {nombreMes()}
      </Titulo>
      <div className="card resumen-card">{contenido}</div>
    </section>
  );
}

function CategoriasCard({ resumen, dias, onCambiarDias, onNuevo }) {
  const [todas, setTodas] = useState(false);
  const datos = resumen.data;
  let contenido;

  if (resumen.cargando) {
    contenido = (
      <Cargando texto="Cargando gastos por categoría…">
        <div className="pila-resumen">
          <Skeleton ancho="40%" />
          <Skeleton />
          <Skeleton ancho="90%" />
          <Skeleton ancho="80%" />
        </div>
      </Cargando>
    );
  } else if (resumen.error && !datos) {
    contenido = <ErrorEstado mensaje={resumen.error} onReintentar={resumen.recargar} />;
  } else if (!datos || !datos.totalGeneral) {
    contenido = (
      <Vacio texto={`No hay gastos en los últimos ${dias} días.`}>
        <button type="button" className="btn btn-secondary" onClick={() => onNuevo("gasto")}>
          <i className="ph ph-plus" aria-hidden="true" />
          Cargar un gasto
        </button>
      </Vacio>
    );
  } else {
    const entradas = categoriasOrdenadas(datos.porCategoria, datos.totalGeneral);
    const principales = entradas.slice(0, CATEGORIAS_A_LA_VISTA);
    const otras = entradas.slice(CATEGORIAS_A_LA_VISTA);
    const pctOtras = otras.reduce((s, c) => s + c.pct, 0);
    const visibles = todas ? entradas : principales;
    contenido = (
      <>
        <div className="categorias-total">
          <span className="texto-tenue">Total</span>
          {/* El backend ya pasa a pesos los gastos en otras monedas. */}
          <span className="num categorias-monto">{fmtMoney(datos.totalGeneral)}</span>
        </div>
        <div className="categorias-barra" aria-hidden="true">
          {principales.map((c) => (
            <span key={c.nombre} style={{ "--ancho": c.pct, "--color-barra": colorDeCategoria(c.nombre) }} />
          ))}
          {pctOtras > 0 && <span className="categorias-barra-otras" style={{ "--ancho": pctOtras }} />}
        </div>
        <ul className="lista categorias-lista" aria-label={`Total ${fmtMoney(datos.totalGeneral)}, por categoría`}>
          {visibles.map((c) => (
            <li key={c.nombre}>
              <span className="punto" style={{ "--color-punto": colorDeCategoria(c.nombre) }} />
              <span className="categorias-nombre">{c.nombre}</span>
              <span className="texto-tenue texto-chico num">{Math.round(c.pct)}%</span>
              <span className="num negrita">{fmtMoney(c.total)}</span>
            </li>
          ))}
        </ul>
        {otras.length > 0 && (
          <button type="button" className="btn-link resumen-link btn-alinear-inicio" onClick={() => setTodas(!todas)} aria-expanded={todas}>
            {todas ? "Ver menos" : `Ver las otras ${otras.length}`}
          </button>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="titulo-categorias" aria-busy={resumen.actualizando || undefined} className="resumen-bloque resumen-area-categorias">
      <Titulo id="titulo-categorias">En qué se fue</Titulo>
      <div className="card resumen-card">
        <PeriodoSelector dias={dias} onCambiar={onCambiarDias} />
        {contenido}
      </div>
    </section>
  );
}

// Tocar un movimiento abre el mismo editor que en Movimientos.
function UltimosCard({ gastos, ingresos, dias, monedaPorCuenta, categorias, cuentas, onNuevo, onIrA, onCambio }) {
  const lista = ultimosMovimientos(gastos.data, ingresos.data, MOVIMIENTOS_A_LA_VISTA);
  const [editando, setEditando] = useState(null);
  let contenido;

  if (gastos.cargando || ingresos.cargando) {
    contenido = (
      <Cargando texto="Cargando últimos movimientos…">
        <SkeletonFilas cantidad={MOVIMIENTOS_A_LA_VISTA} />
      </Cargando>
    );
  } else if (gastos.error && !gastos.data) {
    contenido = <ErrorEstado mensaje={gastos.error} onReintentar={gastos.recargar} />;
  } else if (lista.length === 0) {
    contenido = (
      <Vacio texto={`No hay movimientos en los últimos ${dias} días.`}>
        <button type="button" className="btn btn-secondary" onClick={() => onNuevo()}>
          <i className="ph ph-plus" aria-hidden="true" />
          Cargar un movimiento
        </button>
      </Vacio>
    );
  } else {
    contenido = (
      <ul className="lista resumen-lista">
        {lista.map((t, i) => {
          const esIngreso = t.tipo === "ingreso";
          const categoria = t.categoria || "Sin categoría";
          const dia = nombreDia(t.fecha);
          const cuando = dia === "Hoy" || dia === "Ayer" ? dia.toLowerCase() : fmtFecha(t.fecha);
          const monto = fmtMoney(t.monto, t.moneda || monedaPorCuenta[t.cuenta] || "ARS");
          return (
            <li key={`${t.tipo}-${t.fecha}-${t.hora || ""}-${i}`}>
              <button
                type="button"
                className="resumen-fila"
                onClick={() => setEditando(t)}
                aria-label={`Editar ${esIngreso ? "ingreso" : "gasto"}: ${t.descripcion || "sin descripción"}, ${categoria}, ${esIngreso ? "más" : "menos"} ${monto}, ${cuando}`}
              >
                <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(categoria) }} aria-hidden="true">
                  <i className={iconoPorCategoria(t.categoria)} />
                </span>
                <span className="movimiento-texto">
                  <span className="movimiento-desc">{t.descripcion || "Sin descripción"}</span>
                  <span className="texto-tenue texto-chico mov-detalle">
                    {categoria} · {cuando}
                  </span>
                </span>
                <span className={"movimiento-monto num" + (esIngreso ? " es-ingreso" : "")}>
                  <span className="visualmente-oculto">{esIngreso ? "Entró" : "Salió"} </span>
                  <span aria-hidden="true">{esIngreso ? "+ " : "− "}</span>
                  {monto}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section
      aria-labelledby="titulo-ultimos"
      aria-busy={gastos.actualizando || ingresos.actualizando || undefined}
      className="resumen-bloque resumen-area-ultimos"
    >
      <Titulo
        id="titulo-ultimos"
        accion={
          <button type="button" className="btn-link resumen-link" onClick={() => onIrA("movimientos")}>
            Ver todos
          </button>
        }
      >
        Últimos movimientos
      </Titulo>
      <div className="card resumen-card">{contenido}</div>
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
    </section>
  );
}

// La detección de gastos en los mails: si está apagada invita a activarla;
// si está prendida muestra la bandeja de lo que falta revisar.
function MailsCard({
  config,
  revision,
  revisando,
  dias,
  pendientes,
  cargandoPendientes,
  categorias,
  cuentas,
  monedaPorCuenta,
  onCambiarDias,
  onCambiarModo,
  onRevisar,
  onVerARevisar,
  onCambio,
  onActivar,
}) {
  const modo = config.data?.modo || "apagado";
  let contenido;

  if (config.cargando) {
    contenido = (
      <Cargando texto="Cargando la detección de mails…">
        <Skeleton ancho="60%" />
      </Cargando>
    );
  } else if (config.error && !config.data) {
    contenido = <ErrorEstado mensaje={config.error} onReintentar={config.recargar} />;
  } else if (modo === "apagado") {
    contenido = (
      <>
        <p className="texto-intro">Dejá que Taros Money encuentre tus compras y pagos en tus mails. Vos solo confirmás.</p>
        <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={onActivar}>
          <i className="ph ph-sparkle" aria-hidden="true" />
          Activar
        </button>
      </>
    );
  } else {
    contenido = (
      <RevisionMails
        compacto
        revision={revision}
        revisando={revisando}
        dias={dias}
        onCambiarDias={onCambiarDias}
        onRevisar={onRevisar}
        pendientes={pendientes}
        cargandoPendientes={cargandoPendientes}
        categorias={categorias}
        cuentas={cuentas}
        monedaPorCuenta={monedaPorCuenta}
        onVerTodos={onVerARevisar}
        onCambio={onCambio}
        modo={modo}
        onCambiarModo={onCambiarModo}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-mails-resumen" className="resumen-bloque resumen-area-mails">
      <Titulo id="titulo-mails-resumen">Gastos de tus mails</Titulo>
      <div className="card resumen-card mails-card">{contenido}</div>
    </section>
  );
}

// El total sube contando hasta el número nuevo (más satisfactorio que un
// salto seco). Sin animación si la persona pidió menos movimiento.
function NumeroQueSube({ valor }) {
  const destino = Number(valor) || 0;
  const quieto = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [mostrado, setMostrado] = useState(() => (quieto() ? destino : 0));
  const actual = useRef(mostrado);

  useEffect(() => {
    const inicio = actual.current;
    if (quieto() || inicio === destino) {
      actual.current = destino;
      setMostrado(destino);
      return undefined;
    }
    const DURACION = 700;
    const t0 = performance.now();
    let cuadro;
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / DURACION);
      const suave = 1 - Math.pow(1 - t, 3);
      actual.current = inicio + (destino - inicio) * suave;
      setMostrado(actual.current);
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [destino]);

  return fmtMoney(Math.round(mostrado));
}

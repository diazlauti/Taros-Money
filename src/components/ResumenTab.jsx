import { useEffect, useRef, useState } from "react";
import { aPesos, fmtMoney, fmtFecha, iconoPorCategoria, nombreMes } from "../format";
import RevisionMails from "./RevisionMails";
import { DIAS_AVISO, etiquetaEstado, iconoServicio, serviciosConEstado, textoVencimiento } from "../servicios";
import { colorDeCategoria, nombreDia } from "../movimientos";
import {
  categoriasOrdenadas,
  esDeEsteMes,
  fechaEnDias,
  guardarOcultarSaldo,
  leerOcultarSaldo,
  leerSubsPagadas,
  proximosPagos,
  soloConfirmados,
  subYaPagada,
  textoCobroSub,
  totalEnPesos,
  totalesPorDia,
  ultimosMovimientos,
} from "../resumen";
import { Cargando, ErrorEstado, ErrorYaMostrado, Skeleton, SkeletonFilas, Vacio } from "./Estado";
import EditarMovimientoDialog from "./EditarMovimientoDialog";
import PagarServicioDialog from "./PagarServicioDialog";
import PagarSuscripcionDialog from "./PagarSuscripcionDialog";
import { EtiquetaSinSubir } from "./EstadoConexion";
import PeriodoSelector from "./PeriodoSelector";

// Cuántas categorías y movimientos se ven sin tocar «Ver más».
const CATEGORIAS_A_LA_VISTA = 4;
const MOVIMIENTOS_A_LA_VISTA = 4;
const PAGOS_A_LA_VISTA = 3;

// Resumen: arriba la tarjeta con tu plata, accesos rápidos, lo que tenés
// para hacer (servicios y mails), en qué se fue y los últimos movimientos.
export default function ResumenTab({
  saldo,
  resumen,
  gastos,
  ingresos,
  cuentas,
  servicios,
  suscripciones,
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
  const [oculto, setOculto] = useState(leerOcultarSaldo);
  function alternarOculto() {
    guardarOcultarSaldo(!oculto);
    setOculto(!oculto);
  }

  // Con Google caído, el error se explica una vez (en Tu plata) y el resto dice "No se pudo cargar".
  const errorArriba = saldo.error && !cuentas.data?.length ? saldo.error : null;

  return (
    <ErrorYaMostrado.Provider value={errorArriba}>
    <div className="resumen">
      <SaldoCard
        oculto={oculto}
        onAlternarOculto={alternarOculto}
        onNuevo={onNuevo}
        saldo={saldo}
        cuentas={cuentas}
        gastos={gastos}
        ingresos={ingresos}
        dias={dias}
        cotizaciones={cotizaciones}
        monedaPorCuenta={monedaPorCuenta}
        onIrA={onIrA}
      />
      <NumerosDelPeriodo
        gastos={gastos}
        ingresos={ingresos}
        dias={dias}
        cotizaciones={cotizaciones}
        monedaPorCuenta={monedaPorCuenta}
        oculto={oculto}
      />
      <AccionesRapidas onNuevo={onNuevo} onIrA={onIrA} />
      <ParaHacer
        servicios={servicios}
        suscripciones={suscripciones}
        gastos={gastos.data}
        cuentas={cuentas.data}
        cotizaciones={cotizaciones}
        monedaPorCuenta={monedaPorCuenta}
        onIrA={onIrA}
        onCambioMovimientos={onCambioMovimientos}
      />
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
    </ErrorYaMostrado.Provider>
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

function SaldoCard({ oculto, onAlternarOculto, onNuevo, saldo, cuentas, gastos, ingresos, dias, cotizaciones, monedaPorCuenta, onIrA }) {
  const lista = cuentas.data || [];
  const hayCuentas = lista.length > 0;
  // El total es la suma de las cuentas (las de otras monedas pasadas a pesos
  // con la cotización de Configuración) en cuanto haya alguna; si no, el
  // saldo manual de la planilla. Sin cotización, esas cuentas quedan afuera.
  const faltaCotizacion = lista.some((c) => aPesos(c.saldo, c.moneda, cotizaciones) === null);
  const totalCuentasArs = lista.reduce((sum, c) => sum + (aPesos(c.saldo, c.moneda, cotizaciones) ?? 0), 0);
  const tapar = (texto) => (oculto ? "$ •••••" : texto);


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
        principal
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
          onClick={onAlternarOculto}
          aria-pressed={oculto}
          aria-label={oculto ? "Mostrar montos" : "Ocultar montos"}
          title={oculto ? "Mostrar montos" : "Ocultar montos"}
        >
          <i className={oculto ? "ph ph-eye-slash" : "ph ph-eye"} aria-hidden="true" />
        </button>
        {/* En la compu los accesos van acá arriba, chiquitos. */}
        <div className="saldo-botones-compu" role="group" aria-label="Cargar">
          <button type="button" className="btn saldo-boton" onClick={() => onNuevo("gasto")}>
            <i className="ph ph-minus" aria-hidden="true" />
            Gasto
          </button>
          <button type="button" className="btn saldo-boton" onClick={() => onNuevo("ingreso")}>
            <i className="ph ph-plus" aria-hidden="true" />
            Ingreso
          </button>
        </div>
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
  const entro = valor(ingresos) ?? tapar(`+${fmtMoney(totalEnPesos(soloConfirmados(ingresos.data), monedaPorCuenta, cotizaciones))}`);
  const salio = valor(gastos) ?? tapar(`-${fmtMoney(totalEnPesos(soloConfirmados(gastos.data), monedaPorCuenta, cotizaciones))}`);
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

// Compu: lo que entró y salió en dos tarjetas propias, con una barrita por
// día para ver de un vistazo cuándo se movió la plata.
function NumerosDelPeriodo({ gastos, ingresos, dias, cotizaciones, monedaPorCuenta, oculto }) {
  const tarjetas = [
    { id: "entro", titulo: "Entró", icono: "ph ph-arrow-down-left", estado: ingresos, signo: "+" },
    { id: "salio", titulo: "Salió", icono: "ph ph-arrow-up-right", estado: gastos, signo: "-" },
  ];
  return (
    <div className="resumen-numeros resumen-area-numeros">
      {tarjetas.map((t) => {
        const cargando = t.estado.cargando;
        const sinDatos = t.estado.error && !t.estado.data;
        const total = totalEnPesos(soloConfirmados(t.estado.data), monedaPorCuenta, cotizaciones);
        const barras = sinDatos || cargando ? [] : totalesPorDia(t.estado.data, dias, monedaPorCuenta, cotizaciones);
        const maximo = Math.max(...barras, 0);
        return (
          <section key={t.id} className={`card numero-card numero-card--${t.id}`} aria-labelledby={`numero-${t.id}`}>
            <div className="numero-cabeza">
              <span className="numero-icono" aria-hidden="true">
                <i className={t.icono} />
              </span>
              <h2 id={`numero-${t.id}`}>
                {t.titulo} <span className="texto-tenue">· {dias} días</span>
              </h2>
            </div>
            <p className="numero-valor num">
              {cargando ? <Skeleton ancho="70%" /> : sinDatos ? "—" : oculto ? "$ •••••" : `${t.signo}${fmtMoney(total)}`}
            </p>
            <div className="numero-barras" aria-hidden="true">
              {barras.map((v, i) => (
                <span key={i} style={{ "--alto": maximo ? `${Math.max(4, (v / maximo) * 100)}%` : "4%", "--orden": i }} className={v ? "" : "vacia"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
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

// El mismo ícono que en Servicios: el del nombre ("Luz", "Internet") o el de su categoría.
function iconoDeServicio(s) {
  return iconoServicio(s.nombre) || iconoPorCategoria(s.categoria);
}

// Lo que toca pagar: servicios del mes que faltan y el próximo cobro de cada
// suscripción, juntos y por fecha. Aparece lo que tengas cargado.
function ParaHacer({ servicios, suscripciones, gastos, cuentas, cotizaciones, monedaPorCuenta, onIrA, onCambioMovimientos }) {
  // Tocar una fila abre «Pagar» ahí mismo (servicio o suscripción).
  const [pagando, setPagando] = useState(null);
  const [marcas, setMarcas] = useState(leerSubsPagadas);
  const conEstado = serviciosConEstado(servicios.data);
  const subs = suscripciones.data || [];
  // Lo ya pagado deja de aparecer hasta el próximo cobro.
  const pagos = proximosPagos(conEstado, subs).filter((p) => p.tipo !== "suscripcion" || !subYaPagada(p, gastos, marcas));
  const hayServicios = conEstado.length > 0;
  const haySubs = subs.length > 0;
  const moneda = (p) => monedaPorCuenta[p.cuenta] || "ARS";
  const enPesos = (p) => aPesos(p.monto, monedaPorCuenta[p.cuenta], cotizaciones) ?? 0;
  const faltaPagar = pagos.filter((p) => esDeEsteMes(p)).reduce((sum, p) => sum + enPesos(p), 0);

  // Si falló una sola de las dos, se muestra la otra y abajo se avisa.
  const fallo = [
    servicios.error && !servicios.data && { cual: "tus servicios", seccion: servicios },
    suscripciones.error && !suscripciones.data && { cual: "tus suscripciones", seccion: suscripciones },
  ].filter(Boolean);

  let contenido;
  if ((servicios.cargando && !servicios.data) || (suscripciones.cargando && !suscripciones.data)) {
    contenido = (
      <Cargando texto="Cargando lo que tenés para pagar…">
        <SkeletonFilas cantidad={2} />
      </Cargando>
    );
  } else if (fallo.length === 2 || (fallo.length === 1 && !hayServicios && !haySubs)) {
    contenido = (
      <ErrorEstado
        mensaje={fallo[0].seccion.error}
        onReintentar={() => fallo.forEach((f) => f.seccion.recargar())}
      />
    );
  } else if (!hayServicios && !haySubs) {
    contenido = (
      <Vacio icono="ph ph-receipt" texto="Cargá tus servicios (luz, internet) o suscripciones (Netflix, Spotify) y acá ves qué te toca pagar.">
        <button type="button" className="btn btn-secondary" onClick={() => onIrA("servicios")}>
          <i className="ph ph-plus" aria-hidden="true" />
          Servicios
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => onIrA("recurrentes")}>
          <i className="ph ph-plus" aria-hidden="true" />
          Suscripciones
        </button>
      </Vacio>
    );
  } else if (pagos.length === 0) {
    contenido = (
      <p className="para-hacer-listo">
        <span className="resumen-icono resumen-icono--ok" aria-hidden="true">
          <i className="ph ph-check" />
        </span>
        {haySubs ? "Ya pagaste todo por ahora." : `Ya pagaste todos los servicios de ${nombreMes()}.`}
      </p>
    );
  } else {
    contenido = (
      <>
        <ul className="lista resumen-lista">
          {pagos.slice(0, PAGOS_A_LA_VISTA).map((p) => {
            const esSub = p.tipo === "suscripcion";
            const monto = fmtMoney(p.monto, moneda(p));
            const cuando = esSub ? textoCobroSub(p.dias) : etiquetaEstado(p);
            const urgente = esSub ? p.dias <= DIAS_AVISO : p.estado !== "pendiente";
            const clase = esSub ? "pronto" : p.estado;
            return (
              <li key={`${p.tipo}-${p.nombre}`}>
                <button
                  type="button"
                  className="resumen-fila"
                  onClick={() => setPagando(p)}
                  aria-label={`Pagar ${p.nombre}, ${monto}, ${esSub ? cuando.toLowerCase() : textoVencimiento(p)}`}
                >
                  <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(p.categoria || p.nombre) }} aria-hidden="true">
                    <i className={esSub ? iconoPorCategoria(p.categoria) : iconoDeServicio(p)} />
                  </span>
                  <span className="movimiento-texto">
                    <span className="movimiento-desc">{p.nombre}</span>
                  </span>
                  <span className="mov-derecha">
                    <span className="movimiento-monto num">{monto}</span>
                    {urgente ? (
                      <span className={`tag tag-estado tag-estado--${clase}`}>{cuando}</span>
                    ) : (
                      <span className="texto-tenue texto-chico">{cuando}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {fallo.length === 1 && (
          <p className="resumen-pie texto-tenue texto-chico">
            No se pudieron cargar {fallo[0].cual}.{" "}
            <button type="button" className="btn-link" onClick={fallo[0].seccion.recargar}>
              Reintentar
            </button>
          </p>
        )}
        {faltaPagar > 0 && (
          <p className="resumen-pie texto-tenue texto-chico">
            Falta <span className="num">{fmtMoney(faltaPagar)}</span> en {nombreMes()}
          </p>
        )}
      </>
    );
  }

  // «Ver» lleva a donde está lo tuyo; con los dos, a Servicios (ahí arriba se cambia).
  const verTexto = hayServicios && haySubs ? "Ver todo" : haySubs ? "Ver suscripciones" : "Ver servicios";

  return (
    <section aria-labelledby="titulo-para-hacer" className="resumen-bloque resumen-area-pagar">
      <Titulo
        id="titulo-para-hacer"
        accion={
          (hayServicios || haySubs) && (
            <button type="button" className="btn-link resumen-link" onClick={() => onIrA(hayServicios ? "servicios" : "recurrentes")}>
              {verTexto}
            </button>
          )
        }
      >
        Para pagar
      </Titulo>
      <div className="card resumen-card">{contenido}</div>
      {pagando?.tipo === "servicio" && (
        <PagarServicioDialog
          servicio={pagando}
          cuentas={cuentas}
          monedaPorCuenta={monedaPorCuenta}
          onClose={() => setPagando(null)}
          onGuardado={(conGasto) => {
            servicios.recargar();
            if (conGasto) onCambioMovimientos?.("gasto");
          }}
        />
      )}
      {pagando?.tipo === "suscripcion" && (
        <PagarSuscripcionDialog
          suscripcion={pagando}
          fechaCobro={fechaEnDias(pagando.dias)}
          cuentas={cuentas}
          monedaPorCuenta={monedaPorCuenta}
          onClose={() => setPagando(null)}
          onGuardado={(conGasto) => {
            setMarcas(leerSubsPagadas());
            if (conGasto) onCambioMovimientos?.("gasto");
          }}
        />
      )}
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
    // Compu: la misma info como dona (con un hueco chico entre porciones).
    let acumulado = 0;
    const tramos = [...principales.map((c) => ({ pct: c.pct, color: colorDeCategoria(c.nombre) })), ...(pctOtras > 0 ? [{ pct: pctOtras, color: "var(--color-divider)" }] : [])]
      .map((t) => {
        const desde = acumulado;
        acumulado += t.pct;
        return `${t.color} ${desde}% calc(${acumulado}% - 0.6%), transparent calc(${acumulado}% - 0.6%) ${acumulado}%`;
      })
      .join(", ");
    contenido = (
      <>
        <div className="categorias-dona" style={{ "--dona": `conic-gradient(${tramos})` }} aria-hidden="true">
          <span className="num">{fmtMoney(datos.totalGeneral)}</span>
          <span className="texto-tenue texto-chico">en {dias} días</span>
        </div>
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
                aria-label={`Editar ${esIngreso ? "ingreso" : "gasto"}: ${t.descripcion || "sin descripción"}, ${categoria}, ${esIngreso ? "más" : "menos"} ${monto}, ${cuando}${t.pendiente ? ", sin subir" : ""}`}
              >
                <span className="mov-icono" style={{ "--mov-color": colorDeCategoria(categoria) }} aria-hidden="true">
                  <i className={iconoPorCategoria(t.categoria)} />
                </span>
                <span className="movimiento-texto">
                  <span className="movimiento-desc">{t.descripcion || "Sin descripción"}</span>
                  <span className="texto-tenue texto-chico mov-detalle">
                    {categoria} · {cuando}
                  </span>
                  <EtiquetaSinSubir movimiento={t} />
                </span>
                <span className={"movimiento-monto num" + (esIngreso ? " es-ingreso" : "")}>
                  <span className="visualmente-oculto">{esIngreso ? "Entró" : "Salió"} </span>
                  <span aria-hidden="true">{esIngreso ? "+" : "-"}</span>
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

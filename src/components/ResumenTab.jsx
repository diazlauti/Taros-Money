import { aPesos, fmtMoney, fmtFecha, iconoPorCategoria, nombreMes } from "../format";
import RevisionMails from "./RevisionMails";
import { serviciosConEstado, TEXTO_ESTADO, textoVencimiento } from "../servicios";
import { colorPorCategoria } from "../theme";
import { Cargando, ErrorEstado, Skeleton, SkeletonFilas, Vacio } from "./Estado";
import PeriodoSelector from "./PeriodoSelector";

export default function ResumenTab({
saldo,
resumen,
gastos,
cuentas,
servicios,
cotizaciones,
monedaPorCuenta,
dias,
onCambiarDias,
onNuevo,
onIrA,
mails,
}) {
return (
<>
<SaldoCard saldo={saldo} cuentas={cuentas} cotizaciones={cotizaciones} onIrA={onIrA} />

{mails && <MailsCard {...mails} />}
<ServiciosCard servicios={servicios} cotizaciones={cotizaciones} monedaPorCuenta={monedaPorCuenta} onIrA={onIrA} />

<PeriodoSelector dias={dias} onCambiar={onCambiarDias} />

<div className="grid-2">
<CategoriasCard resumen={resumen} dias={dias} onNuevo={onNuevo} />
<UltimosGastosCard
gastos={gastos}
dias={dias}
monedaPorCuenta={monedaPorCuenta}
onNuevo={onNuevo}
onIrA={onIrA}
/>
</div>
</>
);
}

function SaldoCard({ saldo, cuentas, cotizaciones, onIrA }) {
const lista = cuentas.data || [];
const hayCuentas = lista.length > 0;
// El saldo grande es la suma de las cuentas (convirtiendo las que están en
// otras monedas a ARS con las cotizaciones elegidas en Configuración) en vez del valor manual de la
// planilla, en cuanto haya al menos una cuenta cargada. Si falta la
// cotización, las cuentas en USD quedan afuera y se avisa.
const faltaCotizacion = lista.some((c) => aPesos(c.saldo, c.moneda, cotizaciones) === null);
const totalCuentasArs = lista.reduce((sum, c) => sum + (aPesos(c.saldo, c.moneda, cotizaciones) ?? 0), 0);

let contenido;
if (cuentas.cargando || (!hayCuentas && saldo.cargando)) {
contenido = (
<Cargando texto="Cargando saldo…">
<Skeleton variante="monto" />
<div className="pila-chica">
<Skeleton ancho="50%" />
<Skeleton ancho="40%" />
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
<Vacio texto="Todavía no hay saldo. Agregá tus cuentas para verlo acá.">
<button type="button" className="btn btn-secondary" onClick={() => onIrA("cuentas")}>
<i className="ph ph-plus" aria-hidden="true" />
Agregar una cuenta
</button>
</Vacio>
);
} else {
contenido = (
<>
<div className="monto-grande">{fmtMoney(hayCuentas ? totalCuentasArs : saldo.data)}</div>
{hayCuentas && (
<ul className="lista pila-chica">
{lista.map((c) => {
const enPesos = aPesos(c.saldo, c.moneda, cotizaciones);
return (
<li key={c.nombre} className="texto-tenue">
{c.nombre}: {fmtMoney(c.saldo, c.moneda)}
{c.moneda !== "ARS" && enPesos !== null && ` (≈ ${fmtMoney(enPesos)})`}
</li>
);
})}
</ul>
)}
{faltaCotizacion && (
<p className="aviso-inline">
<i className="ph ph-info" aria-hidden="true" />
El total no incluye las cuentas en otras monedas porque falta su cotización (fijala en Configuración › Monedas).
</p>
)}
</>
);
}

return (
<section className="card" aria-labelledby="titulo-saldo">
<h2 className="card-kicker" id="titulo-saldo">
Saldo estimado
</h2>
{contenido}
</section>
);
}

// Los servicios del mes que faltan pagar, los más urgentes primero.
function ServiciosCard({ servicios, cotizaciones, monedaPorCuenta, onIrA }) {
const lista = serviciosConEstado(servicios.data);
const pendientes = lista.filter((s) => s.estado !== "pagado");
const enPesos = (s) => aPesos(s.monto, monedaPorCuenta[s.cuenta], cotizaciones) ?? 0;
const faltaPagar = pendientes.reduce((sum, s) => sum + enPesos(s), 0);
const verTodos = (
<button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={() => onIrA("servicios")}>
<i className="ph ph-receipt" aria-hidden="true" />
{lista.length === 0 ? "Agregar servicios" : "Ver servicios"}
</button>
);

let contenido;
if (servicios.cargando) {
contenido = (
<Cargando texto="Cargando servicios…">
<Skeleton ancho="60%" />
<Skeleton ancho="80%" />
<Skeleton ancho="70%" />
</Cargando>
);
} else if (servicios.error && !servicios.data) {
contenido = <ErrorEstado mensaje={servicios.error} onReintentar={servicios.recargar} />;
} else if (lista.length === 0) {
contenido = <Vacio icono="ph ph-receipt" texto="Cargá la luz, el gas, internet o el alquiler y acá ves cuáles te faltan pagar este mes.">{verTodos}</Vacio>;
} else if (pendientes.length === 0) {
contenido = (
<>
<p className="fila es-ingreso negrita">
<i className="ph ph-check-circle" aria-hidden="true" />
Ya pagaste todos los servicios de {nombreMes()}.
</p>
{verTodos}
</>
);
} else {
contenido = (
<>
<div className="fila-separada">
<span>
Te {pendientes.length === 1 ? "falta 1" : `faltan ${pendientes.length}`} de {lista.length}
</span>
<span className="monto-chico">{fmtMoney(faltaPagar)}</span>
</div>
<ul className="lista lista-servicios-resumen">
{pendientes.slice(0, 3).map((s) => (
<li key={s.nombre}>
<span className="fila">
<span className={`tag tag-estado tag-estado--${s.estado}`}>{TEXTO_ESTADO[s.estado]}</span>
{s.nombre}
</span>
<span className="texto-tenue texto-chico">
{textoVencimiento(s)} ({fmtFecha(s.vencimiento)})
</span>
</li>
))}
</ul>
{verTodos}
</>
);
}

return (
<section className="card" aria-labelledby="titulo-servicios-resumen">
<h2 className="card-kicker" id="titulo-servicios-resumen">
Servicios de {nombreMes()}
</h2>
{contenido}
</section>
);
}

function CategoriasCard({ resumen, dias, onNuevo }) {
const datos = resumen.data;
let contenido;

if (resumen.cargando) {
contenido = (
<Cargando texto="Cargando gastos por categoría…">
<div className="fila">
<Skeleton variante="circulo" />
<div className="leyenda">
<Skeleton />
<Skeleton ancho="80%" />
<Skeleton ancho="60%" />
</div>
</div>
</Cargando>
);
} else if (resumen.error && !datos) {
contenido = <ErrorEstado mensaje={resumen.error} onReintentar={resumen.recargar} />;
} else if (!datos || !datos.totalGeneral) {
contenido = (
<Vacio texto={`No hay gastos en los últimos ${dias} días.`}>
<button type="button" className="btn btn-secondary" onClick={onNuevo}>
<i className="ph ph-plus" aria-hidden="true" />
Cargar un gasto
</button>
</Vacio>
);
} else {
const categorias = Object.keys(datos.porCategoria || {});
const entradas = Object.entries(datos.porCategoria || {}).sort((a, b) => b[1].total - a[1].total);
const partes = entradas.reduce(
(acc, [nombre, d]) => {
const pct = (d.total / datos.totalGeneral) * 100;
acc.lista.push(`${colorPorCategoria(nombre, categorias)} ${acc.desde}% ${acc.desde + pct}%`);
acc.desde += pct;
return acc;
},
{ lista: [], desde: 0 }
).lista;

contenido = (
<div className="fila">
<div className="dona" style={{ "--gradiente": `conic-gradient(${partes.join(", ")})` }} aria-hidden="true">
<div className="dona-centro">
<span className="texto-tenue">Total</span>
{/* El backend ya convierte los gastos de Cuscatlán (USD) a ARS con la
    cotización antes de sumarlos con los de Efectivo/Mercado Pago, así
    que este total siempre viene en pesos. */}
<span className="negrita">{fmtMoney(datos.totalGeneral)}</span>
</div>
</div>
<ul className="lista leyenda" aria-label={`Total ${fmtMoney(datos.totalGeneral)}, por categoría`}>
{entradas.map(([nombre, d]) => (
<li key={nombre} className="leyenda-item">
<span className="punto" style={{ "--color-punto": colorPorCategoria(nombre, categorias) }} />
<span>{nombre}</span>
<span className="texto-tenue">{Math.round((d.total / datos.totalGeneral) * 100)}%</span>
<span className="negrita">{fmtMoney(d.total)}</span>
</li>
))}
</ul>
</div>
);
}

return (
<section className="card" aria-labelledby="titulo-categorias" aria-busy={resumen.actualizando || undefined}>
<h2 className="card-kicker" id="titulo-categorias">
Gastos por categoría
</h2>
{contenido}
</section>
);
}

function UltimosGastosCard({ gastos, dias, monedaPorCuenta, onNuevo, onIrA }) {
// Los de mails sin confirmar no son gastos todavía: se ven en Movimientos.
const lista = (gastos.data || []).filter((g) => !g.sinConfirmar);
let contenido;

if (gastos.cargando) {
contenido = (
<Cargando texto="Cargando últimos gastos…">
<SkeletonFilas cantidad={4} />
</Cargando>
);
} else if (gastos.error && !gastos.data) {
contenido = <ErrorEstado mensaje={gastos.error} onReintentar={gastos.recargar} />;
} else if (lista.length === 0) {
contenido = (
<Vacio texto={`No hay gastos en los últimos ${dias} días.`}>
<button type="button" className="btn btn-secondary" onClick={onNuevo}>
<i className="ph ph-plus" aria-hidden="true" />
Cargar un gasto
</button>
</Vacio>
);
} else {
contenido = (
<>
<ul className="lista">
{lista.slice(0, 6).map((g, i) => (
<li key={i}>
<div className="movimiento">
<i className={iconoPorCategoria(g.categoria)} aria-hidden="true" />
<div className="movimiento-texto">
<span className="movimiento-desc">{g.descripcion || "Sin descripción"}</span>
<span className="texto-tenue texto-chico">
{g.categoria || "Sin categoría"} · {fmtFecha(g.fecha)}
</span>
</div>
<span className="movimiento-monto">{fmtMoney(g.monto, monedaPorCuenta[g.cuenta] || "ARS")}</span>
</div>
</li>
))}
</ul>
<button type="button" className="btn btn-texto btn-alinear-inicio" onClick={() => onIrA("movimientos")}>
Ver todos y editar
</button>
</>
);
}

return (
<section className="card" aria-labelledby="titulo-ultimos" aria-busy={gastos.actualizando || undefined}>
<h2 className="card-kicker" id="titulo-ultimos">
Últimos gastos
</h2>
{contenido}
</section>
);
}

// La detección de gastos en los mails, a mano en el Resumen: si está apagada
// invita a activarla; si está prendida muestra qué falta revisar.
function MailsCard({ config, cantidadARevisar, revision, revisando, dias, onCambiarDias, onIrABusqueda, onRevisar, onVerARevisar, onActivar }) {
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
<p className="texto-intro">
Dejá que Taros Money lea los mails de tus compras y pagos y los cargue solo. Vos solo confirmás.
</p>
<button type="button" className="btn btn-primary btn-alinear-inicio" onClick={onActivar}>
<i className="ph ph-sparkle" aria-hidden="true" />
Activar
</button>
</>
);
} else {
contenido = (
<>
{cantidadARevisar > 0 && (
<div className="fila-separada">
<p className="mails-card-cuenta" aria-live="polite">
<strong>{cantidadARevisar}</strong> para revisar
</p>
<button type="button" className="btn btn-secondary" onClick={onVerARevisar}>
Ver
</button>
</div>
)}
<RevisionMails
revision={revision}
revisando={revisando}
dias={dias}
onCambiarDias={onCambiarDias}
onRevisar={onRevisar}
onVerEncontrados={onVerARevisar}
onIrABusqueda={onIrABusqueda}
/>
</>
);
}

return (
<section className="card mails-card" aria-labelledby="titulo-mails-resumen">
<h2 className="card-kicker" id="titulo-mails-resumen">
<i className="ph ph-envelope-simple-open" aria-hidden="true" /> Gastos desde tus mails
</h2>
{contenido}
</section>
);
}

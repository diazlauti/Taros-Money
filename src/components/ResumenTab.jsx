import { aPesos, fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import { colorPorCategoria } from "../theme";
import { Cargando, ErrorEstado, Skeleton, SkeletonFilas, Vacio } from "./Estado";
import PeriodoSelector from "./PeriodoSelector";

export default function ResumenTab({
saldo,
resumen,
gastos,
cuentas,
cotizacionUsdArs,
monedaPorCuenta,
dias,
onCambiarDias,
onNuevo,
onIrA,
mails,
}) {
return (
<>
<SaldoCard saldo={saldo} cuentas={cuentas} cotizacionUsdArs={cotizacionUsdArs} onIrA={onIrA} />

{mails && <MailsCard {...mails} />}

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

function SaldoCard({ saldo, cuentas, cotizacionUsdArs, onIrA }) {
const lista = cuentas.data || [];
const hayCuentas = lista.length > 0;
// El saldo grande es la suma de las cuentas (convirtiendo las que están en
// USD a ARS con la cotización del script) en vez del valor manual de la
// planilla, en cuanto haya al menos una cuenta cargada. Si falta la
// cotización, las cuentas en USD quedan afuera y se avisa.
const faltaCotizacion = lista.some((c) => aPesos(c.saldo, c.moneda, cotizacionUsdArs) === null);
const totalCuentasArs = lista.reduce((sum, c) => sum + (aPesos(c.saldo, c.moneda, cotizacionUsdArs) ?? 0), 0);

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
const enPesos = aPesos(c.saldo, c.moneda, cotizacionUsdArs);
return (
<li key={c.nombre} className="texto-tenue">
{c.nombre}: {fmtMoney(c.saldo, c.moneda)}
{c.moneda === "USD" && enPesos !== null && ` (≈ ${fmtMoney(enPesos)})`}
</li>
);
})}
</ul>
)}
{faltaCotizacion && (
<p className="aviso-inline">
<i className="ph ph-info" aria-hidden="true" />
El total no incluye las cuentas en dólares porque no se pudo traer la cotización.
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
const lista = gastos.data || [];
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
function MailsCard({ config, cantidadARevisar, revisando, onRevisar, onVerARevisar, onActivar }) {
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
<p className="mails-card-cuenta" aria-live="polite">
{cantidadARevisar === 0 ? (
"Todo revisado. No hay gastos de tus mails esperando."
) : (
<>
<strong>{cantidadARevisar}</strong>{" "}
{cantidadARevisar === 1 ? "gasto de tus mails para revisar" : "gastos de tus mails para revisar"}
</>
)}
</p>
<div className="fila">
{cantidadARevisar > 0 && (
<button type="button" className="btn btn-primary" onClick={onVerARevisar}>
Revisarlos
</button>
)}
<button type="button" className="btn btn-secondary" onClick={onRevisar} disabled={revisando}>
<i className="ph ph-envelope-simple" aria-hidden="true" />
{revisando ? "Revisando mails…" : "Revisar ahora"}
</button>
</div>
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

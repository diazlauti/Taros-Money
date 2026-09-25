import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import { colorPorCategoria } from "../theme";

const PERIODOS = [7, 14, 30, 90];

export default function ResumenTab({
saldo,
cargandoSaldo,
resumen,
cargandoResumen,
gastos,
cargandoGastos,
dias,
onCambiarDias,
cuentas,
}) {
const categorias = resumen ? Object.keys(resumen.porCategoria || {}) : [];
const entradas = resumen
? Object.entries(resumen.porCategoria).sort((a, b) => b[1].total - a[1].total)
: [];

const gradientParts = entradas.reduce(
(acc, [nombre, datos]) => {
const pct = resumen.totalGeneral ? (datos.total / resumen.totalGeneral) * 100 : 0;
const color = colorPorCategoria(nombre, categorias);
acc.partes.push(`${color} ${acc.desde}% ${acc.desde + pct}%`);
acc.desde += pct;
return acc;
},
{ partes: [], desde: 0 }
).partes;
const gradiente = gradientParts.length ? `conic-gradient(${gradientParts.join(", ")})` : "var(--color-divider)";

return (
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
<div className="card">
<span className="card-kicker">Saldo estimado</span>
<div style={{ fontSize: 34, fontWeight: 600, fontFamily: "var(--font-heading)" }}>
{cargandoSaldo ? "…" : saldo === null || saldo === undefined ? "sin datos" : fmtMoney(saldo)}
</div>
{cuentas && cuentas.length > 0 && (
<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
{cuentas.map((c) => (
<span key={c.nombre} className="tag">
{c.nombre}: {fmtMoney(c.saldo)}
</span>
))}
</div>
)}
</div>

<div className="selector-periodo">
{PERIODOS.map((p) => (
<button
key={p}
className={"chip" + (dias === p ? " is-active" : "")}
onClick={() => onCambiarDias(p)}
>
{p}d
</button>
))}
</div>

<div className="grid-2">
<div className="card">
<span className="card-kicker">Gastos por categoría</span>
{cargandoResumen ? (
<p className="mensaje-estado">Cargando resumen…</p>
) : !resumen || resumen.totalGeneral === 0 ? (
<p className="mensaje-estado">No hay gastos cargados en este período.</p>
) : (
<div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
<div
style={{
position: "relative",
width: 130,
height: 130,
flex: "none",
borderRadius: "50%",
background: gradiente,
}}
>
<div
style={{
position: "absolute",
inset: 16,
borderRadius: "50%",
background: "var(--color-surface)",
display: "flex",
flexDirection: "column",
alignItems: "center",
justifyContent: "center",
}}
>
<span className="text-muted">Total</span>
<span style={{ fontSize: 15, fontWeight: 600 }}>{fmtMoney(resumen.totalGeneral)}</span>
</div>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 160 }}>
{entradas.map(([nombre, datos]) => {
const pct = (datos.total / resumen.totalGeneral) * 100;
return (
<div key={nombre} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
<span
style={{
width: 9,
height: 9,
borderRadius: "50%",
background: colorPorCategoria(nombre, categorias),
flex: "none",
}}
/>
<span style={{ flex: 1 }}>{nombre}</span>
<span className="text-muted">{pct.toFixed(0)}%</span>
<span style={{ fontWeight: 500 }}>{fmtMoney(datos.total)}</span>
</div>
);
})}
</div>
</div>
)}
</div>

<div className="card">
<span className="card-kicker">Últimos gastos</span>
{cargandoGastos ? (
<p className="mensaje-estado">Cargando gastos…</p>
) : !gastos || gastos.length === 0 ? (
<p className="mensaje-estado">No hay gastos cargados en este período.</p>
) : (
<div>
{gastos.slice(0, 6).map((g, i) => (
<div className="movimiento" key={i}>
<i className={iconoPorCategoria(g.categoria)} />
<div style={{ minWidth: 0 }}>
<div className="movimiento-desc">{g.descripcion || "(sin descripción)"}</div>
<div className="text-muted">
{g.categoria || "sin categoría"} · {fmtFecha(g.fecha)}
</div>
</div>
<div className="movimiento-monto">{fmtMoney(g.monto)}</div>
</div>
))}
</div>
)}
</div>
</div>
</div>
);
}
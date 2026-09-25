import { useMemo, useState } from "react";
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";

export default function MovimientosTab({ gastos, ingresos, cargando }) {
const [filtro, setFiltro] = useState("todos");

const combinados = useMemo(() => {
const g = (gastos || []).map((x) => ({ ...x, tipo: "gasto" }));
const i = (ingresos || []).map((x) => ({ ...x, tipo: "ingreso" }));
return [...g, ...i].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
}, [gastos, ingresos]);

const filtrados = combinados.filter((t) => filtro === "todos" || t.tipo === filtro);

return (
<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
<div className="seg">
<label className="seg-opt">
<input type="radio" name="filtro-mov" checked={filtro === "todos"} onChange={() => setFiltro("todos")} />
Todos
</label>
<label className="seg-opt">
<input
type="radio"
name="filtro-mov"
checked={filtro === "ingreso"}
onChange={() => setFiltro("ingreso")}
/>
Ingresos
</label>
<label className="seg-opt">
<input type="radio" name="filtro-mov" checked={filtro === "gasto"} onChange={() => setFiltro("gasto")} />
Gastos
</label>
</div>
<div className="card">
{cargando ? (
<p className="mensaje-estado">Cargando movimientos…</p>
) : filtrados.length === 0 ? (
<p className="mensaje-estado">No hay movimientos en este período.</p>
) : (
filtrados.map((t, i) => (
<div className="movimiento" key={i}>
<i className={iconoPorCategoria(t.categoria)} />
<div style={{ minWidth: 0 }}>
<div className="movimiento-desc">{t.descripcion || "(sin descripción)"}</div>
<div className="text-muted">
{t.categoria || "sin categoría"} · {fmtFecha(t.fecha)}
</div>
</div>
<div className={"movimiento-monto" + (t.tipo === "ingreso" ? " es-ingreso" : "")}>
{t.tipo === "ingreso" ? "+" : "-"}
{fmtMoney(t.monto)}
</div>
</div>
))
)}
</div>
</div>
);
}

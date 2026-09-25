import { useState } from "react";
import { crearMeta, aportarMeta } from "../api";
import { fmtMoney } from "../format";

export default function MetasTab({ metas, cargando, error, onCambio }) {
const [nombre, setNombre] = useState("");
const [objetivo, setObjetivo] = useState("");
const [enviando, setEnviando] = useState(false);
const [errorForm, setErrorForm] = useState("");
const [aportando, setAportando] = useState(null);

async function agregar(e) {
e.preventDefault();
if (!nombre.trim() || !objetivo) return;
setEnviando(true);
setErrorForm("");
try {
await crearMeta({ nombre: nombre.trim(), objetivo: parseFloat(objetivo), actual: 0 });
setNombre("");
setObjetivo("");
onCambio?.();
} catch (err) {
setErrorForm(err.message || "No se pudo crear la meta.");
} finally {
setEnviando(false);
}
}

async function aportar(nombreMeta) {
    const monto = window.prompt(`¿Cuánto querés sumar a "${nombreMeta}"?`);
    const num = parseFloat(monto);
    if (!num || num <= 0) return;
    setAportando(nombreMeta);
    try {
    await aportarMeta(nombreMeta, num);
    onCambio?.();
    } catch (err) {
    setErrorForm(err.message || "No se pudo registrar el aporte.");
    } finally {
    setAportando(null);
    }
    }


}
return (
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
{cargando ? (
<p className="mensaje-estado">Cargando metas…</p>
) : error ? (
<p className="mensaje-estado">Todavía no está conectada esta sección ({error}).</p>
) : (
<div className="grid-cards">
{(metas || []).map((g) => {
const pct = Math.min(100, Math.round((g.actual / g.objetivo) * 100) || 0);
return (
<div className="card" key={g.nombre}>
<span className="card-title">{g.nombre}</span>
<div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
<span className="text-muted">
{fmtMoney(g.actual)} de {fmtMoney(g.objetivo)}
</span>
<span style={{ fontWeight: 600 }}>{pct}%</span>
</div>
<div className="progreso-pista">
<div className="progreso-relleno" style={{ width: `${pct}%` }} />
</div>
<button
className="btn btn-secondary"
onClick={() => aportar(g.nombre)}
disabled={aportando === g.nombre}
>
{aportando === g.nombre ? "Guardando…" : "Sumar aporte"}
</button>
</div>
);
})}
{(!metas || metas.length === 0) && <p className="mensaje-estado">Todavía no cargaste ninguna meta.</p>}
</div>
)}

<form className="card" onSubmit={agregar} style={{ maxWidth: 360 }}>
    <span className="card-kicker">Nueva meta</span>
    <div className="fila-2">
    <div className="field">
    <label>Nombre</label>
    <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Vacaciones" />
    </div>
    <div className="field">
    <label>Objetivo</label>
    <input
    className="input"
    type="number"
    step="0.01"
    value={objetivo}
    onChange={(e) => setObjetivo(e.target.value)}
    placeholder="0.00"
    />
    </div>
    </div>
    <button className="btn btn-primary" type="submit" disabled={enviando}>
    {enviando ? "Guardando…" : "Crear meta"}
    </button>
    {errorForm && <p className="mensaje-error">{errorForm}</p>}
    </form>
    </div>
    );
    }
    
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";

export default function RecurrentesTab({ suscripciones, cargando, error }) {
if (cargando) return <p className="mensaje-estado">Cargando recurrentes…</p>;
if (error) return <p className="mensaje-estado">Todavía no está conectada esta sección ({error}).</p>;
if (!suscripciones || suscripciones.length === 0) {
return <p className="mensaje-estado">No hay gastos recurrentes cargados en la planilla.</p>;
}

const total = suscripciones.reduce((sum, s) => sum + (Number(s.monto) || 0), 0);

return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div className="card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
    <span className="card-kicker" style={{ margin: 0 }}>
    Total mensual recurrente
    </span>
    <span style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoney(total)}</span>
    </div>
    <div className="grid-cards">
    {suscripciones.map((s, i) => (
    <div className="card" key={i}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <i className={iconoPorCategoria(s.categoria)} />
    <span className="card-title">{s.nombre}</span>
    </div>
    <span className="tag">{s.categoria}</span>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
    <span style={{ fontSize: 18, fontWeight: 600 }}>{fmtMoney(s.monto)}/mes</span>
    <span className="text-muted">próx. {fmtFecha(s.proximaFecha)}</span>
    </div>
    </div>
    ))}
    </div>
    </div>
    );
    }

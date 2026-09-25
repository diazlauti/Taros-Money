import { fmtMoney } from "../format";

export default function ReportesTab({ tendencia, cargando, error }) {
if (cargando) return <p className="mensaje-estado">Cargando reportes…</p>;
if (error) return <p className="mensaje-estado">Todavía no está conectada esta sección ({error}).</p>;
if (!tendencia || tendencia.length === 0) {
return <p className="mensaje-estado">Todavía no hay suficiente historial para el reporte.</p>;
}

const maxVal = Math.max(...tendencia.map((m) => Math.max(m.ingresos, m.gastos)), 1);
const ultimo = tendencia[tendencia.length - 1];

return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div className="card">
    <span className="card-kicker">Ingresos vs gastos — últimos {tendencia.length} meses</span>
    <div style={{ display: "flex", gap: 12, fontSize: 11 }} className="text-muted">
    <span>
    <i className="ph ph-square-fill" style={{ color: "var(--color-accent)" }} /> Ingresos
    </span>
    <span>
    <i className="ph ph-square-fill" style={{ color: "var(--color-accent-2, var(--exito))" }} /> Gastos
    </span>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 160, paddingTop: 12 }}>
    {tendencia.map((m) => (
    <div key={m.mes} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 130 }}>
    <div
    style={{
    width: 14,
    height: Math.round((m.ingresos / maxVal) * 130),
    background: "var(--color-accent)",
    border: "2px solid var(--ink)",
    borderRadius: "3px 3px 0 0",
    }}
    />
    <div
    style={{
    width: 14,
    height: Math.round((m.gastos / maxVal) * 130),
    background: "var(--exito)",
    border: "2px solid var(--ink)",
    borderRadius: "3px 3px 0 0",
    }}
    />
    </div>
    <span className="text-muted">{m.mes}</span>
    </div>
    ))}
    </div>
    </div>

    {ultimo && (
        <div className="card">
        <span className="card-kicker">Resumen del último mes</span>
        <div className="grid-cards">
        <div>
        <div className="text-muted">Ingresos</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-accent)" }}>{fmtMoney(ultimo.ingresos)}</div>
        </div>
        <div>
        <div className="text-muted">Gastos</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{fmtMoney(ultimo.gastos)}</div>
        </div>
        <div>
        <div className="text-muted">Ahorro neto</div>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{fmtMoney(ultimo.ingresos - ultimo.gastos)}</div>
        </div>
        </div>
        </div>
        )}
        </div>
        );
        }
    
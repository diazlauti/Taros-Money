import { useState } from "react";
import { crearCuenta } from "../api";
import { fmtMoney } from "../format";

export default function CuentasTab({ cuentas, cargando, error, onCambio }) {
const [nombre, setNombre] = useState("");
const [saldoInicial, setSaldoInicial] = useState("");
const [moneda, setMoneda] = useState("ARS");
const [enviando, setEnviando] = useState(false);
const [errorForm, setErrorForm] = useState("");

async function agregar(e) {
e.preventDefault();
if (!nombre.trim()) return;
setEnviando(true);
setErrorForm("");
try {
await crearCuenta({ nombre: nombre.trim(), saldo: parseFloat(saldoInicial) || 0, moneda });
setNombre("");
setSaldoInicial("");
onCambio?.();
} catch (err) {
setErrorForm(err.message || "No se pudo crear la cuenta.");
} finally {
setEnviando(false);
}
}

return (
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
{cargando ? (
<p className="mensaje-estado">Cargando cuentas…</p>
) : error ? (
<p className="mensaje-estado">Todavía no está conectada esta sección ({error}).</p>
) : (
<div className="grid-cards">
{(cuentas || []).map((c) => (
<div className="card" key={c.nombre}>
<span className="card-title">{c.nombre}</span>
<div style={{ fontSize: 22, fontWeight: 600 }}>{fmtMoney(c.saldo, c.moneda)}</div>
</div>
))}
{(!cuentas || cuentas.length === 0) && (
<p className="mensaje-estado">Todavía no cargaste ninguna cuenta.</p>
)}
</div>
)}

<form className="card" onSubmit={agregar} style={{ maxWidth: 360 }}>
    <span className="card-kicker">Agregar cuenta</span>
    <div className="fila-2">
    <div className="field">
    <label>Nombre</label>
    <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Banco" />
    </div>
    <div className="field">
    <label>Saldo inicial</label>
    <input
    className="input"
    type="number"
    step="0.01"
    value={saldoInicial}
    onChange={(e) => setSaldoInicial(e.target.value)}
    placeholder="0.00"
    />
    </div>
    <div className="field">
    <label>Moneda</label>
    <select className="input" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
    <option value="ARS">Pesos (ARS)</option>
    <option value="USD">Dólares (USD)</option>
    </select>
    </div>
    </div>
    <button className="btn btn-primary" type="submit" disabled={enviando}>
    {enviando ? "Guardando…" : "Agregar"}
    </button>
    {errorForm && <p className="mensaje-error">{errorForm}</p>}
    </form>
    </div>
    );
    }
    
import { useState } from "react";
import { ajustarCuenta, crearCuenta } from "../api";
import { fmtMoney } from "../format";
import { playError, playSuccess } from "../sounds";

export default function CuentasTab({ cuentas, cargando, error, onCambio }) {
const [nombre, setNombre] = useState("");
const [saldoInicial, setSaldoInicial] = useState("");
const [moneda, setMoneda] = useState("ARS");
const [enviando, setEnviando] = useState(false);
const [errorForm, setErrorForm] = useState("");
const [ajustando, setAjustando] = useState(null);

async function agregar(e) {
e.preventDefault();
if (!nombre.trim()) return;
setEnviando(true);
setErrorForm("");
try {
await crearCuenta({ nombre: nombre.trim(), saldo: parseFloat(saldoInicial) || 0, moneda });
playSuccess();
setNombre("");
setSaldoInicial("");
onCambio?.();
} catch (err) {
playError();
setErrorForm(err.message || "No se pudo crear la cuenta.");
} finally {
setEnviando(false);
}
}

// Para corregir el saldo de una cuenta ya creada: sumar o restar, nunca
// "recrearla" con el mismo nombre (el backend ahora rechaza eso a propósito,
// porque antes pisaba el saldo viejo sin avisar).
async function ajustar(c) {
const texto = window.prompt(
`¿Cuánto sumar o restar a "${c.nombre}"? (negativo para restar, ej: -500)`
);
if (texto === null) return;
const delta = parseFloat(texto);
if (!delta) return;
setAjustando(c.nombre);
try {
await ajustarCuenta(c.nombre, delta);
playSuccess();
onCambio?.();
} catch (err) {
playError();
setErrorForm(err.message || "No se pudo ajustar el saldo.");
} finally {
setAjustando(null);
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
{c.esTarjeta ? (
<span className="text-muted" style={{ fontSize: 12 }}>Se actualiza sola con los mails del banco</span>
) : (
<button
className="btn btn-secondary"
style={{ alignSelf: "flex-start" }}
onClick={() => ajustar(c)}
disabled={ajustando === c.nombre}
>
{ajustando === c.nombre ? "Ajustando…" : "Ajustar saldo"}
</button>
)}
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
    
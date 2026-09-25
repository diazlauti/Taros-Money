import { useState } from "react";
import { agregarGasto, agregarIngreso, ajustarCuenta } from "../api";

const GASTO_CATS_FALLBACK = ["Comida", "Transporte", "Servicios", "Entretenimiento", "Otros"];
const INGRESO_CATS = ["Sueldo", "Freelance", "Otro ingreso"];

function fechaHoraActual() {
const ahora = new Date();
const pad = (n) => String(n).padStart(2, "0");
return {
fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
};
}

export default function NuevoMovimientoDialog({ categorias, cuentas, onClose, onGuardado }) {
const catsGasto = categorias && categorias.length ? categorias : GASTO_CATS_FALLBACK;
const [tipo, setTipo] = useState("gasto");
const [form, setForm] = useState(() => ({
...fechaHoraActual(),
monto: "",
descripcion: "",
categoria: "",
cuenta: cuentas && cuentas[0] ? cuentas[0].nombre : "",
}));
const [enviando, setEnviando] = useState(false);
const [error, setError] = useState("");

function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
    }

    async function submit(e) {
    e.preventDefault();
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) {
    setError("Ingresá un monto válido.");
    return;
    }
    setEnviando(true);
    setError("");
    try {
    const payload = {
    fecha: form.fecha,
    hora: form.hora,
    monto,
    descripcion: form.descripcion,
    categoria: form.categoria,
    };
    if (tipo === "gasto") {
    await agregarGasto(payload);
    } else {
    await agregarIngreso(payload);
    }
    // Si eligió una cuenta, ajustamos su saldo (no toca la hoja de Gastos).
    if (form.cuenta) {
    try {
    await ajustarCuenta(form.cuenta, tipo === "ingreso" ? monto : -monto);
    } catch {
    /* la sección de cuentas puede no estar conectada todavía */
    }
    }
    onGuardado?.();
    onClose();
    } catch (err) {
    setError(err.message || "No se pudo guardar el movimiento.");
    } finally {
    setEnviando(false);
    }
    }

    return (
        <div className="dialog-backdrop" onClick={onClose}>
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">Nuevo movimiento</div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="seg">
        <label className="seg-opt">
        <input type="radio" name="tipo-mov" checked={tipo === "gasto"} onChange={() => setTipo("gasto")} />
        Gasto
        </label>
        <label className="seg-opt">
        <input type="radio" name="tipo-mov" checked={tipo === "ingreso"} onChange={() => setTipo("ingreso")} />
        Ingreso
        </label>
        </div>

        <div className="fila-2">
            <div className="field">
            <label>Fecha</label>
            <input className="input" type="date" value={form.fecha} onChange={(e) => campo("fecha", e.target.value)} required />
            </div>
            <div className="field">
            <label>Monto</label>
            <input
            className="input"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={form.monto}
            onChange={(e) => campo("monto", e.target.value)}
            required
            />
            </div>
            </div>

            <div className="field">
                <label>Descripción</label>
                <input
                className="input"
                type="text"
                placeholder="Ej: Supermercado"
                value={form.descripcion}
                onChange={(e) => campo("descripcion", e.target.value)}
                />
                </div>

                <div className="fila-2">
                    {cuentas && cuentas.length > 0 && (
                    <div className="field">
                    <label>Cuenta</label>
                    <select className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
                    {cuentas.map((c) => (
                    <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                    </option>
                    ))}
                    </select>
                    </div>
                    )}
                    <div className="field">
                    <label>Categoría</label>
                    <select className="input" value={form.categoria} onChange={(e) => campo("categoria", e.target.value)}>
                    <option value="">(sin categoría)</option>
                    {(tipo === "gasto" ? catsGasto : INGRESO_CATS).map((c) => (
                    <option key={c} value={c}>
                    {c}
                    </option>
                    ))}
                    </select>
                    </div>
                    </div>


    )
<div className="dialog-actions">
<button type="button" className="btn btn-secondary" onClick={onClose}>
Cancelar
</button>
<button type="submit" className="btn btn-primary" disabled={enviando}>
{enviando ? "Guardando…" : "Guardar"}
</button>
</div>
{error && <p className="mensaje-error">{error}</p>}
</form>
</div>
</div>
);
}
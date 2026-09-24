import { useState } from "react";
import { agregarGasto } from "../api";

function fechaHoraActual() {
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    fecha: `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`,
    hora: `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`,
  };
}

export default function FormularioGasto({ categorias, onGastoAgregado }) {
  const [form, setForm] = useState(() => ({
    ...fechaHoraActual(),
    categoria: "",
    descripcion: "",
    monto: "",
  }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  function actualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setExito(false);
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      await agregarGasto(form);
      setExito(true);
      setForm((f) => ({ ...fechaHoraActual(), categoria: f.categoria, descripcion: "", monto: "" }));
      onGastoAgregado?.();
    } catch (err) {
      setError(err.message || "No se pudo cargar el gasto.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="formulario-gasto" onSubmit={manejarSubmit}>
      <div className="formulario-gasto__fila">
        <label>
          Fecha
          <input
            type="date"
            value={form.fecha}
            onChange={(e) => actualizarCampo("fecha", e.target.value)}
            required
          />
        </label>
        <label>
          Hora
          <input
            type="time"
            value={form.hora}
            onChange={(e) => actualizarCampo("hora", e.target.value)}
            required
          />
        </label>
      </div>

      <label>
        Monto (ARS)
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={form.monto}
          onChange={(e) => actualizarCampo("monto", e.target.value)}
          required
        />
      </label>

      <label>
        Descripción
        <input
          type="text"
          placeholder="Ej: Farmacity"
          value={form.descripcion}
          onChange={(e) => actualizarCampo("descripcion", e.target.value)}
        />
      </label>

      <label>
        Categoría
        <select
          value={form.categoria}
          onChange={(e) => actualizarCampo("categoria", e.target.value)}
        >
          <option value="">(sin categoría)</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <button type="submit" disabled={enviando}>
        {enviando ? "Cargando…" : "Cargar gasto"}
      </button>

      {error && <p className="mensaje-error">{error}</p>}
      {exito && !error && <p className="mensaje-exito">Gasto cargado ✓</p>}
    </form>
  );
}

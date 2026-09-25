import { useMemo, useState } from "react";
import { fmtMoney, fmtFecha, iconoPorCategoria } from "../format";
import EditarGastoDialog from "./EditarGastoDialog";

export default function MovimientosTab({ gastos, ingresos, cargando, categorias, onCambio }) {
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);

  const combinados = useMemo(() => {
    const g = (gastos || []).map((x) => ({ ...x, tipo: "gasto" }));
    const i = (ingresos || []).map((x) => ({ ...x, tipo: "ingreso" }));
    return [...g, ...i].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }, [gastos, ingresos]);

  const textoBusqueda = busqueda.trim().toLowerCase();
  const filtrados = combinados.filter((t) => {
    if (filtro !== "todos" && t.tipo !== filtro) return false;
    if (!textoBusqueda) return true;
    const descripcion = (t.descripcion || "").toLowerCase();
    const categoria = (t.categoria || "").toLowerCase();
    return descripcion.includes(textoBusqueda) || categoria.includes(textoBusqueda);
  });

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

      <input
        className="input"
        type="text"
        placeholder="Buscar por descripción o categoría…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <div className="card">
        {cargando ? (
          <p className="mensaje-estado">Cargando movimientos…</p>
        ) : filtrados.length === 0 ? (
          <p className="mensaje-estado">
            {textoBusqueda ? "No hay movimientos que coincidan con la búsqueda." : "No hay movimientos en este período."}
          </p>
        ) : (
          filtrados.map((t, i) => (
            <div
              className={"movimiento" + (t.tipo === "gasto" ? " movimiento--clicable" : "")}
              key={i}
              onClick={() => t.tipo === "gasto" && setEditando(t)}
              title={t.tipo === "gasto" ? "Tocar para editar o borrar" : undefined}
            >
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

      {editando && (
        <EditarGastoDialog
          gasto={editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}
    </div>
  );
}

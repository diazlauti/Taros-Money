import Campo from "./Campo";
import CategoriaChips from "./CategoriaChips";

// Campos compartidos entre "Nueva suscripción" y "Editar suscripción".
export default function CamposSuscripcion({ form, campo, v, categorias, cuentas, autoFocus = false, nombreRef }) {
  return (
    <>
      <Campo etiqueta="Nombre" error={v.visible("nombre")}>
        {(p) => (
          <input
            {...p}
            ref={nombreRef}
            data-autofocus={autoFocus || undefined}
            className="input"
            type="text"
            placeholder="Ej: Netflix"
            value={form.nombre}
            onChange={(e) => campo("nombre", e.target.value)}
            onBlur={() => v.tocar("nombre")}
          />
        )}
      </Campo>
      <div className="fila-2">
        <Campo etiqueta="Monto por mes" error={v.visible("monto")}>
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={form.monto}
              onChange={(e) => campo("monto", e.target.value)}
              onBlur={() => v.tocar("monto")}
            />
          )}
        </Campo>
        <Campo etiqueta="Día de cobro" ayuda="Del 1 al 31" error={v.visible("diaCobro")}>
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ej: 10"
              value={form.diaCobro}
              onChange={(e) => campo("diaCobro", e.target.value)}
              onBlur={() => v.tocar("diaCobro")}
            />
          )}
        </Campo>
      </div>
      <CategoriaChips categorias={categorias} valor={form.categoria} onChange={(c) => campo("categoria", c)} />
      {cuentas && cuentas.length > 0 && (
        <Campo etiqueta="Cuenta de la que se debita">
          {(p) => (
            <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
              <option value="">Elegí una cuenta</option>
              {cuentas.map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre} ({c.moneda})
                </option>
              ))}
            </select>
          )}
        </Campo>
      )}
    </>
  );
}

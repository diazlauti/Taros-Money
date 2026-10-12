import { useId } from "react";
import { iconoPorCategoria } from "../format";

// Categorías como chips tocables (un toque en vez de abrir un desplegable).
export default function CategoriaChips({ categorias, valor, onChange, etiqueta = "Categoría" }) {
  const nombre = useId();
  const opciones = ["", ...(categorias || [])];
  return (
    <fieldset className="field">
      <legend>{etiqueta}</legend>
      <div className="chips">
        {opciones.map((c) => (
          <label className="chip-radio" key={c || "sin-categoria"}>
            <input type="radio" name={nombre} value={c} checked={valor === c} onChange={() => onChange(c)} />
            {c && <i className={iconoPorCategoria(c)} aria-hidden="true" />}
            {c || "Sin categoría"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

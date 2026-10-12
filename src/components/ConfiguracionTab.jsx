import { useState } from "react";
import { playClick, playError, playSuccess } from "../sounds";

export default function ConfiguracionTab({
  urlPlanilla,
  cargando,
  error,
  categorias,
  cargandoCategorias,
  errorCategorias,
  onAgregarCategoria,
  onBorrarCategoria,
  theme,
  onToggleTheme,
  sonido,
  onToggleSonido,
  onCerrarSesion,
}) {
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [borrandoCategoria, setBorrandoCategoria] = useState(null);
  const [errorCategoria, setErrorCategoria] = useState("");

  async function agregar(e) {
    e.preventDefault();
    const nombre = nuevaCategoria.trim();
    if (!nombre) return;
    setGuardandoCategoria(true);
    setErrorCategoria("");
    try {
      await onAgregarCategoria(nombre);
      playSuccess();
      setNuevaCategoria("");
    } catch (err) {
      playError();
      setErrorCategoria(err.message || "No se pudo agregar la categoría.");
    } finally {
      setGuardandoCategoria(false);
    }
  }

  async function borrar(nombre) {
    if (!window.confirm(`¿Borrar la categoría "${nombre}"? Los movimientos que ya la usan no cambian.`)) return;
    setBorrandoCategoria(nombre);
    setErrorCategoria("");
    try {
      await onBorrarCategoria(nombre);
      playClick();
    } catch (err) {
      playError();
      setErrorCategoria(err.message || "No se pudo borrar la categoría.");
    } finally {
      setBorrandoCategoria(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <div className="card">
        <span className="card-kicker">Tu planilla</span>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          Todos tus datos (gastos, ingresos, cuentas, metas, suscripciones) viven en tu propia planilla de Google
          Sheets. Podés abrirla directo para revisar algo puntual o corregirlo a mano.
        </p>
        {cargando ? (
          <p className="mensaje-estado" style={{ padding: 0 }}>Buscando el link…</p>
        ) : error || !urlPlanilla ? (
          <p className="mensaje-estado" style={{ padding: 0 }}>No se pudo conseguir el link ({error || "sin datos"}).</p>
        ) : (
          <a
            className="btn btn-secondary"
            style={{ alignSelf: "flex-start", textDecoration: "none" }}
            href={urlPlanilla}
            target="_blank"
            rel="noreferrer"
          >
            <i className="ph ph-table" />
            Abrir mi planilla
          </a>
        )}
      </div>

      <div className="card">
        <span className="card-kicker">Categorías</span>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
          Las categorías que agregués acá aparecen para elegir al cargar un gasto, ingreso o suscripción.
        </p>

        {cargandoCategorias ? (
          <p className="mensaje-estado" style={{ padding: 0 }}>Cargando categorías…</p>
        ) : errorCategorias ? (
          <p className="mensaje-estado" style={{ padding: 0 }}>No se pudieron cargar ({errorCategorias}).</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(categorias || []).length === 0 && (
              <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>Todavía no agregaste ninguna.</p>
            )}
            {(categorias || []).map((c) => (
              <span
                key={c}
                className="tag"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {c}
                <button
                  type="button"
                  onClick={() => borrar(c)}
                  disabled={borrandoCategoria === c}
                  aria-label={`Borrar categoría ${c}`}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    color: "inherit",
                    opacity: borrandoCategoria === c ? 0.5 : 1,
                  }}
                >
                  <i className="ph ph-x" />
                </button>
              </span>
            ))}
          </div>
        )}

        <form onSubmit={agregar} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            className="input"
            type="text"
            placeholder="Nueva categoría (ej: Mascotas)"
            value={nuevaCategoria}
            onChange={(e) => setNuevaCategoria(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit" disabled={guardandoCategoria || !nuevaCategoria.trim()}>
            {guardandoCategoria ? "Agregando…" : "Agregar"}
          </button>
        </form>
        {errorCategoria && <p className="mensaje-error">{errorCategoria}</p>}
      </div>

      <div className="card">
        <span className="card-kicker">Apariencia y sonido</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={onToggleTheme}>
            <i className={theme === "dark" ? "ph ph-sun" : "ph ph-moon"} />
            {theme === "dark" ? "Modo claro" : "Modo oscuro"}
          </button>
          <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={onToggleSonido}>
            <i className={sonido ? "ph ph-speaker-high" : "ph ph-speaker-slash"} />
            {sonido ? "Sonido activado" : "Sonido silenciado"}
          </button>
        </div>
      </div>

      <div className="card">
        <span className="card-kicker">Cuenta</span>
        <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={onCerrarSesion}>
          <i className="ph ph-sign-out" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

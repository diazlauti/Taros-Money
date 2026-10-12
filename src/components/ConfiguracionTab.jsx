export default function ConfiguracionTab({ urlPlanilla, cargando, error, onCerrarSesion }) {
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
        <span className="card-kicker">Cuenta</span>
        <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={onCerrarSesion}>
          <i className="ph ph-sign-out" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

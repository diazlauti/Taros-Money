import { useState } from "react";
import { iniciarSesionConGoogle } from "../auth";
import { playError, playSuccess } from "../sounds";

export default function Login({ onSuccess }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function entrar() {
    setEnviando(true);
    setError("");
    try {
      await iniciarSesionConGoogle();
      playSuccess();
      onSuccess?.();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="card login-card">
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <i className="ph ph-wallet" />
          Taros Money
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p className="mensaje-estado" style={{ padding: 0 }}>
            Entrá con tu cuenta de Google. La primera vez te va a pedir permiso para crear tu propia planilla —
            es tuya, separada de la de cualquier otra persona que use esta misma app.
          </p>
          <button className="btn btn-primary" onClick={entrar} disabled={enviando}>
            <i className="ph ph-google-logo" />
            {enviando ? "Entrando…" : "Iniciar sesión con Google"}
          </button>
          {error && <p className="mensaje-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}

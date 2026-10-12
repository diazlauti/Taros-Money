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
      setError(err.message || "No se pudo iniciar sesión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pantalla-login">
      <div className="card login-card">
        <h1 className="brand brand--centrada">
          <i className="ph ph-wallet" aria-hidden="true" />
          Taros Money
        </h1>
        <p className="texto-intro">
          Entrá con tu cuenta de Google. La primera vez te va a pedir permiso para crear tu propia planilla, que es
          solo tuya.
        </p>
        <button type="button" className="btn btn-primary" onClick={entrar} disabled={enviando}>
          <i className="ph ph-google-logo" aria-hidden="true" />
          {enviando ? "Entrando…" : error ? "Reintentar" : "Entrar con Google"}
        </button>
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

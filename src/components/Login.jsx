import { useState } from "react";
import { login } from "../api";
import { playError, playSuccess } from "../sounds";

export default function Login({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!pin) return;
    setEnviando(true);
    setError("");
    try {
      await login(pin);
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
      <form className="card login-card" onSubmit={submit}>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 8 }}>
          <i className="ph ph-wallet" />
          Taros Money
        </div>
        <div className="field">
          <label>PIN</label>
          <input
            className="input"
            type="password"
            inputMode="text"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Ingresá tu PIN"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={enviando || !pin}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        {error && <p className="mensaje-error">{error}</p>}
      </form>
    </div>
  );
}

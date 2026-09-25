import { useState } from "react";
import { crearEspacio, login } from "../api";
import { playError, playSuccess } from "../sounds";

export default function Login({ onSuccess }) {
  const [modo, setModo] = useState("elegir-modo"); // "elegir-modo" | "ingresar" | "crear"
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  function irA(nuevoModo) {
    setError("");
    setPin("");
    setConfirmarPin("");
    setModo(nuevoModo);
  }

  async function submitIngresar(e) {
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

  async function submitCrear(e) {
    e.preventDefault();
    if (pin.length < 4) {
      setError("El PIN tiene que tener al menos 4 caracteres.");
      return;
    }
    if (pin !== confirmarPin) {
      setError("Los dos PIN no coinciden.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      await crearEspacio(pin);
      playSuccess();
      onSuccess?.();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo crear tu espacio.");
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

        {modo === "elegir-modo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p className="mensaje-estado" style={{ padding: 0 }}>
              ¿Ya tenés tu espacio o es la primera vez que entrás?
            </p>
            <button className="btn btn-primary" onClick={() => irA("ingresar")}>
              Ya tengo cuenta
            </button>
            <button className="btn btn-secondary" onClick={() => irA("crear")}>
              Es mi primera vez
            </button>
          </div>
        )}

        {modo === "ingresar" && (
          <form onSubmit={submitIngresar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            <button className="btn btn-secondary" type="button" onClick={() => irA("elegir-modo")}>
              Volver
            </button>
          </form>
        )}

        {modo === "crear" && (
          <form onSubmit={submitCrear} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p className="mensaje-estado" style={{ padding: 0 }}>
              Elegí el PIN que vas a usar para entrar. Se va a crear tu propio espacio, separado del de los demás.
            </p>
            <div className="field">
              <label>Elegí tu PIN</label>
              <input
                className="input"
                type="password"
                inputMode="text"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Al menos 4 caracteres"
              />
            </div>
            <div className="field">
              <label>Repetilo</label>
              <input
                className="input"
                type="password"
                inputMode="text"
                value={confirmarPin}
                onChange={(e) => setConfirmarPin(e.target.value)}
                placeholder="De nuevo, para confirmar"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={enviando || !pin || !confirmarPin}>
              {enviando ? "Creando…" : "Crear mi espacio"}
            </button>
            {error && <p className="mensaje-error">{error}</p>}
            <button className="btn btn-secondary" type="button" onClick={() => irA("elegir-modo")}>
              Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

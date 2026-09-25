import { useEffect, useState } from "react";
import { configurarPin, getEstadoPin, login } from "../api";
import { playError, playSuccess } from "../sounds";

export default function Login({ onSuccess }) {
  const [modo, setModo] = useState("cargando"); // "cargando" | "elegir" | "ingresar" | "error-estado"
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEstadoPin()
      .then((configurado) => setModo(configurado ? "ingresar" : "elegir"))
      .catch((err) => {
        setError(err.message || "No se pudo conectar con la planilla.");
        setModo("error-estado");
      });
  }, []);

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

  async function submitElegir(e) {
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
      await configurarPin(pin);
      playSuccess();
      onSuccess?.();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar el PIN.");
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

        {modo === "cargando" && <p className="mensaje-estado">Cargando…</p>}

        {modo === "error-estado" && (
          <>
            <p className="mensaje-error">{error}</p>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Reintentar
            </button>
          </>
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
          </form>
        )}

        {modo === "elegir" && (
          <form onSubmit={submitElegir} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p className="mensaje-estado" style={{ padding: 0 }}>
              Primera vez acá: elegí el PIN que vas a usar para entrar.
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
              {enviando ? "Guardando…" : "Guardar y entrar"}
            </button>
            {error && <p className="mensaje-error">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

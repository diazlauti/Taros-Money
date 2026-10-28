import { useEffect, useRef, useState } from "react";
import { desbloquear } from "../bloqueo";
import { playError, playSuccess } from "../sounds";
import MensajeError from "./MensajeError";

// Pantalla que tapa todo hasta pasar la huella o Face ID. Apenas aparece
// pide la huella sola; si el navegador no deja (algunos exigen un toque) o
// se cancela, queda el botón. Abajo, «Entrar con Google» por si la huella
// no anda: cierra la sesión y se entra como siempre.
export default function PantallaBloqueo({ onDesbloqueada, onEntrarConGoogle }) {
  const [estado, setEstado] = useState("verificando");
  const [error, setError] = useState("");
  const boton = useRef(null);
  const enCurso = useRef(false);

  async function verificar({ automatico = false } = {}) {
    if (enCurso.current) return;
    enCurso.current = true;
    setEstado("verificando");
    setError("");
    try {
      await desbloquear();
      playSuccess();
      onDesbloqueada();
    } catch (err) {
      setEstado("listo");
      // El intento automático puede fallar solo porque falta un toque: ahí
      // no se muestra error, solo el botón.
      if (!automatico) {
        playError();
        setError(err.message);
      }
      requestAnimationFrame(() => boton.current?.focus());
    } finally {
      enCurso.current = false;
    }
  }

  useEffect(() => {
    verificar({ automatico: true });
    // Solo al aparecer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verificando = estado === "verificando";

  return (
    <main className="pantalla-login pantalla-bloqueo" aria-labelledby="titulo-bloqueo">
      <div className="login-contenido">
        <header className="login-hero">
          <img className="login-logo" src="/icon-192.png" alt="" width="192" height="192" />
          <h1 className="login-titulo" id="titulo-bloqueo">
            Taros Money está bloqueada
          </h1>
          <p className="login-lema">Usá tu huella o Face ID para ver tus números.</p>
        </header>

        <div className="card login-card">
          <button
            ref={boton}
            type="button"
            className="btn btn-primary landing-cta"
            onClick={() => verificar()}
            disabled={verificando}
            aria-busy={verificando}
          >
            <i className="ph ph-fingerprint" aria-hidden="true" />
            {verificando ? "Esperando tu huella…" : error ? "Reintentar" : "Desbloquear"}
          </button>
          <div aria-live="polite">{error && <MensajeError avisable={false}>{error}</MensajeError>}</div>
          <p className="login-espera">
            ¿No te anda la huella?
            <button type="button" className="btn btn-texto" onClick={onEntrarConGoogle}>
              Entrar con Google
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

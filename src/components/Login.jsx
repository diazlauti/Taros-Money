import { useState } from "react";
import { iniciarSesionConGoogle } from "../auth";
import { estaInstalada } from "../instalacion";
import { playError, playSuccess } from "../sounds";
import InstalarAppDialog from "./InstalarAppDialog";

const BENEFICIOS = [
  { icono: "ph ph-lightning", texto: "Anotá un gasto o ingreso en segundos" },
  { icono: "ph ph-chart-pie-slice", texto: "Mirá en qué se te va la plata, por categoría" },
  { icono: "ph ph-target", texto: "Seguí tus cuentas, metas y suscripciones" },
];

export default function Login({ onSuccess }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [guiaAbierta, setGuiaAbierta] = useState(false);

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
      <div className="login-contenido">
        <header className="login-hero">
          <img className="login-logo" src="/icon-192.png" alt="" width="192" height="192" />
          <h1 className="login-titulo">Taros Money</h1>
          <p className="login-lema">Tus gastos, ingresos y ahorros, claros y en un solo lugar.</p>
        </header>

        <div className="card login-card">
          <ul className="login-beneficios">
            {BENEFICIOS.map((b, i) => (
              <li key={b.texto}>
                <span className={"login-beneficio-icono" + (i === 1 ? " login-beneficio-icono--violeta" : "")}>
                  <i className={b.icono} aria-hidden="true" />
                </span>
                {b.texto}
              </li>
            ))}
          </ul>

          <button type="button" className="btn btn-primary btn-ancho" onClick={entrar} disabled={enviando}>
            <i className="ph ph-google-logo" aria-hidden="true" />
            {enviando ? "Entrando…" : error ? "Reintentar" : "Entrar con Google"}
          </button>
          {error && (
            <p className="mensaje-error" role="alert">
              {error}
            </p>
          )}

          <p className="login-privacidad">
            <i className="ph ph-lock-simple" aria-hidden="true" />
            La primera vez Google te pide permiso para crear tu propia planilla. Es solo tuya: nadie más ve tus datos.
          </p>
        </div>

        {!estaInstalada() && (
          <button type="button" className="btn btn-texto login-instalar" onClick={() => setGuiaAbierta(true)}>
            <i className="ph ph-device-mobile" aria-hidden="true" />
            Agregala a la pantalla de inicio de tu celu
          </button>
        )}
      </div>

      {guiaAbierta && <InstalarAppDialog onClose={() => setGuiaAbierta(false)} />}
    </main>
  );
}

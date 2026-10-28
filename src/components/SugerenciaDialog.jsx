import { useId, useState } from "react";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { sesionRecordada } from "../auth";
import { NUMERO_VERSION } from "../actualizacion";
import Campo from "./Campo";
import Dialog from "./Dialog";

// Sugerencias y errores que manda la gente desde Configuración › Ayuda. Igual
// que la lista de espera: va por Netlify Forms (la copia estática
// "sugerencias" de index.html es la que Netlify registra al publicar) y
// Netlify le manda el mail a quien administra la app.
const FORM_NAME = "sugerencias";

const TIPOS = [
  ["error", "Algo anda mal", "ph ph-bug"],
  ["idea", "Tengo una idea", "ph ph-lightbulb"],
];

function codificar(datos) {
  return new URLSearchParams(datos).toString();
}

// Datos que ayudan a reproducir un error, sin pedirle nada a la persona.
function datosDelDispositivo() {
  try {
    const instalada = window.matchMedia?.("(display-mode: standalone)").matches ? "instalada" : "navegador";
    return `${navigator.userAgent} · ${window.innerWidth}x${window.innerHeight} · ${instalada}`;
  } catch {
    return "";
  }
}

function errorMailOpcional(texto) {
  const valor = String(texto ?? "").trim();
  if (!valor) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? "" : "Revisá el mail, por ejemplo nombre@gmail.com.";
}

export default function SugerenciaDialog({ onClose }) {
  const nombreTipo = useId();
  const [form, setForm] = useState(() => ({
    tipo: "error",
    mensaje: "",
    email: sesionRecordada()?.email || "",
    trampa: "",
  }));
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({
    mensaje: f.mensaje.trim() ? "" : f.tipo === "error" ? "Contame qué pasó." : "Contame tu idea.",
    email: errorMailOpcional(f.email),
  }));

  function cambiar(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: codificar({
          "form-name": FORM_NAME,
          tipo: form.tipo === "error" ? "Error" : "Sugerencia",
          mensaje: form.mensaje.trim(),
          email: form.email.trim(),
          version: NUMERO_VERSION || "",
          dispositivo: datosDelDispositivo(),
          "bot-field": form.trampa,
        }),
      });
      if (!res.ok) throw new Error();
      playSuccess();
      setEnviado(true);
    } catch {
      playError();
      setError("No se pudo mandar. Revisá tu internet y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Dialog titulo="¡Gracias, ya me llegó!" onClose={onClose}>
        <p className="mensaje-estado" role="status">
          {form.tipo === "error"
            ? "Lo reviso y lo arreglo en una próxima versión."
            : "La leo con tiempo y, si suma, la agrego."}
          {form.email.trim() ? ` Si necesito algo más te escribo a ${form.email.trim()}.` : ""}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
            Listo
          </button>
        </div>
      </Dialog>
    );
  }

  const sucio = form.mensaje !== "" && !enviando;

  return (
    <Dialog titulo="Mandar una sugerencia o error" onClose={onClose} sucio={sucio}>
      <form className="form" onSubmit={enviar} noValidate>
        <fieldset className="field">
          <legend>¿Qué querés contarme?</legend>
          <div className="chips">
            {TIPOS.map(([valor, texto, icono]) => (
              <label className="chip-radio" key={valor}>
                <input
                  type="radio"
                  name={nombreTipo}
                  value={valor}
                  checked={form.tipo === valor}
                  onChange={cambiar("tipo")}
                />
                <i className={icono} aria-hidden="true" />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo
          etiqueta={form.tipo === "error" ? "¿Qué pasó?" : "¿Cuál es tu idea?"}
          ayuda={form.tipo === "error" ? "Dónde estabas y qué tocaste. La versión y el dispositivo van solos." : ""}
          error={v.visible("mensaje")}
        >
          {(p) => (
            <textarea
              {...p}
              data-autofocus
              className="input"
              rows={4}
              maxLength={2000}
              value={form.mensaje}
              onChange={cambiar("mensaje")}
            />
          )}
        </Campo>
        <Campo etiqueta="Tu mail (opcional)" ayuda="Por si necesito preguntarte algo." error={v.visible("email")}>
          {(p) => (
            <input
              {...p}
              className="input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nombre@gmail.com"
              value={form.email}
              onChange={cambiar("email")}
              onBlur={() => v.tocar("email")}
            />
          )}
        </Campo>
        {/* Campo trampa para bots: invisible y fuera del orden de tabulación. */}
        <input
          type="text"
          name="bot-field"
          className="campo-trampa"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={form.trampa}
          onChange={cambiar("trampa")}
        />
        {error && (
          <p className="mensaje-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Mandando…" : error ? "Reintentar" : "Mandar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

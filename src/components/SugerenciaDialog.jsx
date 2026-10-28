import { useEffect, useId, useState } from "react";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { achicarCaptura, cuentaVerificada } from "../sugerencias";
import { NUMERO_VERSION } from "../actualizacion";
import Campo from "./Campo";
import Dialog from "./Dialog";

// Sugerencias y errores que manda la gente desde Configuración › Ayuda. Igual
// que la lista de espera: va por Netlify Forms (la copia estática
// "sugerencias" de index.html es la que Netlify registra al publicar) y
// Netlify le manda el mail a quien administra la app. La cuenta no la escribe
// la persona: sale de su sesión de Google, verificada (ver sugerencias.js).
const FORM_NAME = "sugerencias";

const TIPOS = [
  ["error", "Algo anda mal", "ph ph-bug"],
  ["idea", "Tengo una idea", "ph ph-lightbulb"],
];

// Datos que ayudan a reproducir un error, sin pedirle nada a la persona.
function datosDelDispositivo() {
  try {
    const instalada = window.matchMedia?.("(display-mode: standalone)").matches ? "instalada" : "navegador";
    return `${navigator.userAgent} · ${window.innerWidth}x${window.innerHeight} · ${instalada}`;
  } catch {
    return "";
  }
}

// Con `errorVisto` (desde «Avisar del error») el error ya va adjunto y
// contar qué estabas haciendo es opcional.
export default function SugerenciaDialog({ onClose, errorVisto = null, pantalla = "" }) {
  const desdeError = errorVisto !== null;
  const nombreTipo = useId();
  const [form, setForm] = useState(() => ({
    tipo: "error",
    mensaje: "",
    trampa: "",
  }));
  const [captura, setCaptura] = useState(null);
  const [errorCaptura, setErrorCaptura] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({
    mensaje: f.mensaje.trim() || desdeError ? "" : f.tipo === "error" ? "Contame qué pasó." : "Contame tu idea.",
  }));

  // captura = { archivo, url } (url para la miniatura; se libera al cambiarla).
  useEffect(() => () => captura && URL.revokeObjectURL(captura.url), [captura]);

  async function elegirCaptura(e) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorCaptura("");
    if (!archivo.type.startsWith("image/")) {
      setErrorCaptura("Elegí una imagen (una captura de pantalla).");
      return;
    }
    const lista = await achicarCaptura(archivo);
    if (!lista) {
      setErrorCaptura("La imagen es muy pesada. Probá con una captura de pantalla.");
      return;
    }
    setCaptura({ archivo: lista, url: URL.createObjectURL(lista) });
  }

  function cambiar(campo) {
    return (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setError("");
    try {
      const { cuenta, comprobar } = await cuentaVerificada();
      // multipart (sin Content-Type a mano) para que pueda viajar la captura.
      const datos = new FormData();
      const campos = {
        "form-name": FORM_NAME,
        tipo: desdeError || form.tipo === "error" ? "Error" : "Sugerencia",
        mensaje: form.mensaje.trim(),
        error: errorVisto || "",
        pantalla,
        cuenta,
        comprobar,
        version: NUMERO_VERSION || "",
        dispositivo: datosDelDispositivo(),
        "bot-field": form.trampa,
      };
      for (const [clave, valor] of Object.entries(campos)) datos.append(clave, valor);
      if (captura) datos.append("captura", captura.archivo, "captura.jpg");
      const res = await fetch("/", { method: "POST", body: datos });
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
          {" Si necesito algo más te escribo al mail de tu cuenta."}
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
            Listo
          </button>
        </div>
      </Dialog>
    );
  }

  const sucio = (form.mensaje !== "" || !!captura) && !enviando;

  return (
    <Dialog titulo={desdeError ? "Avisar del error" : "Mandar una sugerencia o error"} onClose={onClose} sucio={sucio}>
      <form className="form" onSubmit={enviar} noValidate>
        {desdeError ? (
          <div className="error-adjunto">
            <p className="field-ayuda">Va adjunto este error, con la versión y el dispositivo:</p>
            <p className="error-adjunto-texto">{errorVisto || "Un error sin mensaje"}</p>
          </div>
        ) : (
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
        )}
        <Campo
          etiqueta={
            desdeError
              ? "¿Qué estabas haciendo? (opcional)"
              : form.tipo === "error"
                ? "¿Qué pasó?"
                : "¿Cuál es tu idea?"
          }
          error={v.visible("mensaje")}
        >
          {(p) => (
            <textarea
              {...p}
              data-autofocus
              className="input"
              rows={4}
              placeholder={
                desdeError || form.tipo === "error"
                  ? "Intenté revisar mis mails y…"
                  : "Contame qué te gustaría que tenga la app."
              }
              maxLength={2000}
              value={form.mensaje}
              onChange={cambiar("mensaje")}
            />
          )}
        </Campo>
        <div className="field">
          {captura ? (
            <div className="captura-elegida">
              <img src={captura.url} alt="Captura adjunta" className="captura-miniatura" />
              <button
                type="button"
                className="btn btn-texto btn-peligro btn-texto-icono"
                onClick={() => setCaptura(null)}
              >
                <i className="ph ph-trash" aria-hidden="true" />
                <span>Sacar captura</span>
              </button>
            </div>
          ) : (
            <label className="btn btn-secondary btn-alinear-inicio btn-archivo">
              <i className="ph ph-image" aria-hidden="true" />
              Adjuntar captura
              <input type="file" accept="image/*" className="visualmente-oculto" onChange={elegirCaptura} />
            </label>
          )}
          {errorCaptura && (
            <p className="field-error" role="alert">
              {errorCaptura}
            </p>
          )}
          {!captura && <p className="field-ayuda">(Opcional)</p>}
        </div>
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

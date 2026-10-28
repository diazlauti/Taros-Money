import { useState } from "react";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { errorEmail } from "../validaciones";
import Campo from "./Campo";
import Dialog from "./Dialog";

// Pedido de acceso para quien todavía no está en la lista de usuarios de
// prueba de Google. Se manda con Netlify Forms (el formulario estático
// "lista-espera" de index.html es el que Netlify detecta al publicar) y
// Netlify le avisa por mail a quien administra la app.
const FORM_NAME = "lista-espera";

function codificar(datos) {
  return new URLSearchParams(datos).toString();
}

export default function ListaEsperaDialog({ onClose }) {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "", trampa: "" });
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => ({ email: errorEmail(f.email) }));

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
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          mensaje: form.mensaje.trim(),
          "bot-field": form.trampa,
        }),
      });
      if (!res.ok) throw new Error();
      playSuccess();
      setEnviado(true);
    } catch {
      playError();
      setError("No se pudo mandar el pedido. Revisá tu internet y probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Dialog titulo="¡Listo, ya estás anotado!" onClose={onClose}>
        <p className="mensaje-estado" role="status">
          Cuando te habiliten te llega la novedad a {form.email.trim()}. Después entrá con ese mismo mail de Google.
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn btn-primary" onClick={onClose} data-autofocus>
            Entendido
          </button>
        </div>
      </Dialog>
    );
  }

  const sucio = (form.nombre || form.email || form.mensaje) !== "" && !enviando;

  return (
    <Dialog titulo="Pedir acceso" onClose={onClose} sucio={sucio}>
      <form className="form" onSubmit={enviar} noValidate>
        <p className="mensaje-estado">
          Por ahora Taros Money es solo para invitados. Dejá tu mail de Google y te avisamos cuando puedas entrar.
        </p>
        <Campo etiqueta="Tu mail de Google" explicacion="El mismo con el que vas a iniciar sesión." error={v.visible("email")}>
          {(p) => (
            <input
              {...p}
              data-autofocus
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
        <Campo etiqueta="Tu nombre (opcional)">
          {(p) => <input {...p} className="input" type="text" autoComplete="name" value={form.nombre} onChange={cambiar("nombre")} />}
        </Campo>
        <Campo etiqueta="¿Algo que quieras contar? (opcional)">
          {(p) => <textarea {...p} className="input" rows={3} value={form.mensaje} onChange={cambiar("mensaje")} />}
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
            {enviando ? "Mandando…" : error ? "Reintentar" : "Anotarme"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

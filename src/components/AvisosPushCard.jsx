import { useCallback, useEffect, useState } from "react";
import { getPush, probarPushBackend } from "../api";
import { useAvisos } from "../avisos";
import { activarPush, desactivarPush, esIOSSinInstalar, pushConfigurado, pushSoportado, suscripcionActual } from "../push";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

async function leerEstadoPush() {
  try {
    const sub = await suscripcionActual();
    const datos = sub ? await getPush(sub.endpoint) : { activo: false };
    return { cargando: false, error: "", activo: !!datos?.activo, endpoint: sub?.endpoint || "" };
  } catch (err) {
    return { cargando: false, error: err.message || "No pude ver si los avisos están prendidos.", activo: false, endpoint: "" };
  }
}

// Configuración → «Avisos en este dispositivo»: prender o apagar los avisos
// que llegan aunque la app esté cerrada (mails para revisar, servicios por
// vencer, suscripciones que se cobran).
export default function AvisosPushCard({ onInstalar }) {
  const { avisar } = useAvisos();
  const [estado, setEstado] = useState({ cargando: true, error: "", activo: false, endpoint: "" });
  const [trabajando, setTrabajando] = useState("");

  const cargar = useCallback(() => leerEstadoPush().then(setEstado), []);

  const disponible = pushSoportado() && !esIOSSinInstalar() && pushConfigurado();
  useEffect(() => {
    if (disponible) cargar();
  }, [disponible, cargar]);

  async function hacer(cual, fn, mensajeOk) {
    setTrabajando(cual);
    try {
      await fn();
      if (mensajeOk) avisar(mensajeOk);
      await cargar();
    } catch (err) {
      avisar(err.message || "No se pudo. Probá de nuevo.", "error");
    } finally {
      setTrabajando("");
    }
  }

  if (!pushConfigurado()) return null;

  let contenido;
  if (!pushSoportado()) {
    contenido = <p className="texto-intro">Este navegador no permite avisos con la app cerrada. Probá con Chrome, Edge, Firefox o Safari.</p>;
  } else if (esIOSSinInstalar()) {
    contenido = (
      <>
        <p className="texto-intro">
          En iPhone los avisos solo llegan con Taros Money agregada a la pantalla de inicio (iOS 16.4 o más nuevo). Instalala y
          volvé a esta sección desde el ícono.
        </p>
        <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={onInstalar}>
          <i className="ph ph-download-simple" aria-hidden="true" />
          Cómo instalarla
        </button>
      </>
    );
  } else if (estado.cargando) {
    contenido = (
      <Cargando texto="Viendo si los avisos están prendidos…">
        <Skeleton ancho="80%" />
        <Skeleton variante="boton" ancho="60%" />
      </Cargando>
    );
  } else if (estado.error) {
    contenido = (
      <ErrorEstado
        mensaje={estado.error}
        onReintentar={() => {
          setEstado((e) => ({ ...e, cargando: true, error: "" }));
          cargar();
        }}
      />
    );
  } else if (!estado.activo) {
    contenido = (
      <>
        <p className="texto-intro">
          Te aviso en este dispositivo aunque tengas la app cerrada: cuando encuentro movimientos en tus mails, y a la mañana si un
          servicio vence o una suscripción se cobra.
        </p>
        {typeof Notification !== "undefined" && Notification.permission === "denied" && (
          <p className="aviso-inline">
            <i className="ph ph-warning" aria-hidden="true" />
            Tenés las notificaciones bloqueadas para esta página: habilitalas en los ajustes del navegador.
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-alinear-inicio"
          disabled={!!trabajando}
          onClick={() => hacer("activar", activarPush, "Listo: te voy a avisar en este dispositivo.")}
        >
          <i className="ph ph-bell-ringing" aria-hidden="true" />
          {trabajando === "activar" ? "Activando…" : "Avisarme en este dispositivo"}
        </button>
      </>
    );
  } else {
    contenido = (
      <>
        <p className="aviso-inline aviso-inline--ok">
          <i className="ph ph-check-circle" aria-hidden="true" />
          Prendidos en este dispositivo. Para otro celu o compu, activalos desde ahí.
        </p>
        <div className="fila">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!!trabajando}
            onClick={() => hacer("probar", () => probarPushBackend(estado.endpoint), "Te mandé un aviso de prueba.")}
          >
            <i className="ph ph-paper-plane-tilt" aria-hidden="true" />
            {trabajando === "probar" ? "Mandando…" : "Mandar uno de prueba"}
          </button>
          <button
            type="button"
            className="btn btn-texto"
            disabled={!!trabajando}
            onClick={() => hacer("apagar", desactivarPush, "Listo: no te aviso más en este dispositivo.")}
          >
            {trabajando === "apagar" ? "Apagando…" : "Apagar"}
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="card" aria-labelledby="titulo-avisos-push">
      <h2 className="card-kicker" id="titulo-avisos-push">
        Avisos en este dispositivo
      </h2>
      <div className="pila-chica" aria-live="polite">
        {contenido}
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import { sesionRecordada } from "../auth";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { apagarBloqueo, bloqueoActivo, bloqueoDisponible, desbloquear, MINUTOS_AFUERA, prenderBloqueo } from "../bloqueo";
import { playClick, playError, playSuccess } from "../sounds";
import { Cargando, Skeleton } from "./Estado";
import Explicacion from "./Explicacion";

// Configuración › Seguridad: prender o apagar el bloqueo con huella o Face ID
// en este dispositivo.
export default function BloqueoCard() {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const [disponible, setDisponible] = useState(null);
  const [activo, setActivo] = useState(bloqueoActivo);
  const [trabajando, setTrabajando] = useState("");

  useEffect(() => {
    let vivo = true;
    bloqueoDisponible().then((si) => vivo && setDisponible(si));
    return () => {
      vivo = false;
    };
  }, []);

  async function prender() {
    playClick();
    setTrabajando("prender");
    try {
      await prenderBloqueo(sesionRecordada()?.email);
      setActivo(true);
      playSuccess();
      avisar("Listo: la app te va a pedir tu huella o Face ID al abrirla.");
    } catch (err) {
      playError();
      avisar(err.message, "error");
    } finally {
      setTrabajando("");
    }
  }

  async function apagar() {
    if (!(await confirmar({ titulo: "¿Apagar el bloqueo?", texto: "Cualquiera que agarre tu celu desbloqueado va a poder ver tus números.", si: "Apagar", peligro: true }))) return;
    apagarBloqueo();
    setActivo(false);
    avisar("Listo: ya no te pido la huella en este dispositivo.");
  }

  async function probar() {
    playClick();
    setTrabajando("probar");
    try {
      await desbloquear();
      playSuccess();
      avisar("Anda bien: te reconoció.");
    } catch (err) {
      playError();
      avisar(err.message, "error");
    } finally {
      setTrabajando("");
    }
  }

  let contenido;
  if (disponible === null) {
    contenido = (
      <Cargando texto="Viendo si este dispositivo tiene huella o Face ID…">
        <Skeleton variante="boton" ancho="100%" />
      </Cargando>
    );
  } else if (!disponible && !activo) {
    contenido = (
      <p className="aviso-inline">
        <i className="ph ph-info" aria-hidden="true" />
        Este dispositivo no tiene huella ni Face ID disponible.
      </p>
    );
  } else {
    contenido = (
      <ul className="opciones">
        <li className="opcion-con-info">
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            className="opcion"
            disabled={!!trabajando}
            onClick={activo ? apagar : prender}
          >
            <i className="ph ph-fingerprint opcion-icono" aria-hidden="true" />
            <span className="opcion-texto">{trabajando === "prender" ? "Esperando tu huella…" : "Pedir huella o Face ID"}</span>
            <span className="interruptor" aria-hidden="true" />
          </button>
          <Explicacion
            texto={`Te la pido al abrir la app y al volver después de ${MINUTOS_AFUERA} minutos afuera, así nadie que agarre tu celu ve tus números. Si algún día no te anda, entrás con Google.`}
            etiqueta="Cómo funciona el bloqueo"
          />
        </li>
        {activo && (
          <li>
            <button type="button" className="opcion" disabled={!!trabajando} onClick={probar}>
              <i className="ph ph-check-circle opcion-icono" aria-hidden="true" />
              <span className="opcion-texto">{trabajando === "probar" ? "Esperando tu huella…" : "Probar"}</span>
              <i className="ph ph-caret-right opcion-flecha" aria-hidden="true" />
            </button>
          </li>
        )}
      </ul>
    );
  }

  return (
    <section className="card" aria-labelledby="titulo-bloqueo-config">
      <h2 className="card-kicker" id="titulo-bloqueo-config">
        Bloqueo con huella o Face ID
      </h2>
      <div aria-live="polite">{contenido}</div>
    </section>
  );
}

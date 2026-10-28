import { useEffect, useState } from "react";
import { sesionRecordada } from "../auth";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { apagarBloqueo, bloqueoActivo, bloqueoDisponible, desbloquear, MINUTOS_AFUERA, prenderBloqueo } from "../bloqueo";
import { playClick, playError, playSuccess } from "../sounds";
import { Cargando, Skeleton } from "./Estado";

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
        <Skeleton ancho="80%" />
        <Skeleton variante="boton" ancho="60%" />
      </Cargando>
    );
  } else if (activo) {
    contenido = (
      <>
        <p className="aviso-inline aviso-inline--ok">
          <i className="ph ph-check-circle" aria-hidden="true" />
          Prendido en este dispositivo. Te pido la huella al abrir la app y al volver después de {MINUTOS_AFUERA} minuto afuera.
        </p>
        <div className="fila">
          <button type="button" className="btn btn-secondary" disabled={!!trabajando} onClick={probar}>
            <i className="ph ph-fingerprint" aria-hidden="true" />
            {trabajando === "probar" ? "Esperando tu huella…" : "Probar"}
          </button>
          <button type="button" className="btn btn-texto" disabled={!!trabajando} onClick={apagar}>
            Apagar
          </button>
        </div>
      </>
    );
  } else if (!disponible) {
    contenido = (
      <p className="texto-intro">
        Este dispositivo o navegador no tiene huella ni Face ID disponible para la app. Si tu celu sí tiene, fijate que esté
        configurado en los ajustes y probá desde la app instalada.
      </p>
    );
  } else {
    contenido = (
      <>
        <p className="texto-intro">
          Para que nadie que agarre tu celu desbloqueado vea tus números. Te pido la huella o Face ID al abrir la app. Si
          algún día no te anda, podés entrar con Google.
        </p>
        <button type="button" className="btn btn-primary btn-alinear-inicio" disabled={!!trabajando} onClick={prender}>
          <i className="ph ph-fingerprint" aria-hidden="true" />
          {trabajando === "prender" ? "Esperando tu huella…" : "Bloquear con huella o Face ID"}
        </button>
      </>
    );
  }

  return (
    <section className="card" aria-labelledby="titulo-bloqueo-config">
      <h2 className="card-kicker" id="titulo-bloqueo-config">
        Bloqueo con huella o Face ID
      </h2>
      <div className="pila-chica" aria-live="polite">
        {contenido}
      </div>
    </section>
  );
}

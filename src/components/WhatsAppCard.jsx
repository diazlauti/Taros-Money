import { useCallback, useEffect, useState } from "react";
import { crearCodigoWhatsApp, desvincularWhatsApp, getWhatsApp } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { playClick, playSuccess } from "../sounds";
import { linkWhatsApp, whatsappConfigurado } from "../whatsapp";
import Explicacion from "./Explicacion";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

async function leerEstado() {
  try {
    return { cargando: false, error: "", datos: await getWhatsApp() };
  } catch (err) {
    return { cargando: false, error: err.message || "No pude ver si tu WhatsApp está vinculado.", datos: null };
  }
}

// Configuración › Gastos › «WhatsApp»: vincular el número para mandarle
// gastos al bot ("café 2500"). Los que mandás caen en Movimientos como
// «Sin confirmar», igual que los de los mails.
export default function WhatsAppCard() {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const [estado, setEstado] = useState({ cargando: true, error: "", datos: null });
  const [codigo, setCodigo] = useState("");
  const [trabajando, setTrabajando] = useState("");

  const cargar = useCallback(
    () =>
      leerEstado().then((nuevo) => {
        setEstado(nuevo);
        return nuevo.datos;
      }),
    [],
  );

  const disponible = whatsappConfigurado();
  useEffect(() => {
    if (disponible) cargar();
  }, [disponible, cargar]);

  // Mientras hay un código pendiente, al volver de WhatsApp se fija si ya quedó.
  useEffect(() => {
    if (!codigo) return undefined;
    const alVolver = async () => {
      if (document.visibilityState !== "visible") return;
      const datos = await cargar();
      if (datos?.vinculado) {
        setCodigo("");
        playSuccess();
        avisar("¡Listo! Ya podés mandarle tus gastos por WhatsApp.");
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [codigo, cargar, avisar]);

  async function pedirCodigo() {
    setTrabajando("codigo");
    playClick();
    try {
      const res = await crearCodigoWhatsApp();
      setCodigo(res.codigo);
    } catch (err) {
      avisar(err.message || "No pude armar el código. Probá de nuevo.", "error");
    } finally {
      setTrabajando("");
    }
  }

  async function desvincular() {
    const ok = await confirmar({
      titulo: "¿Desvincular WhatsApp?",
      texto: "Lo que ya mandaste queda. Para volver a usar el bot vas a tener que vincularlo de nuevo.",
      si: "Desvincular",
    });
    if (!ok) return;
    setTrabajando("desvincular");
    try {
      await desvincularWhatsApp();
      avisar("Listo: desvinculé tu WhatsApp.");
      await cargar();
    } catch (err) {
      avisar(err.message || "No pude desvincularlo. Probá de nuevo.", "error");
    } finally {
      setTrabajando("");
    }
  }

  if (!disponible) return null;
  if (estado.datos && !estado.datos.configurado) return null;

  let contenido;
  if (estado.cargando) {
    contenido = (
      <Cargando texto="Viendo si tu WhatsApp está vinculado…">
        <Skeleton ancho="80%" />
        <Skeleton variante="boton" ancho="50%" />
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
  } else if (estado.datos?.vinculado) {
    contenido = (
      <>
        <p className="aviso-inline aviso-inline--ok">
          <i className="ph ph-check-circle" aria-hidden="true" />
          {estado.datos.fin ? `Vinculado al número que termina en ${estado.datos.fin}.` : "Vinculado."} Mandale «café 2500».
        </p>
        <div className="fila">
          <a className="btn btn-secondary" href={linkWhatsApp()} target="_blank" rel="noopener noreferrer">
            <i className="ph ph-whatsapp-logo" aria-hidden="true" />
            Abrir el chat
          </a>
          <button type="button" className="btn btn-texto" disabled={!!trabajando} onClick={desvincular}>
            {trabajando === "desvincular" ? "Desvinculando…" : "Desvincular"}
          </button>
        </div>
      </>
    );
  } else if (codigo) {
    contenido = (
      <>
        <p className="whatsapp-paso">
          Abrí WhatsApp y mandá el mensaje que ya viene escrito. Si no aparece, mandá este código:
        </p>
        <p className="whatsapp-codigo" aria-label={`Código ${codigo.split("").join(" ")}`}>
          {codigo}
        </p>
        <div className="fila">
          <a className="btn btn-primary" href={linkWhatsApp(codigo)} target="_blank" rel="noopener noreferrer">
            <i className="ph ph-whatsapp-logo" aria-hidden="true" />
            Abrir WhatsApp
          </a>
          <button type="button" className="btn btn-texto" onClick={() => cargar()}>
            Ya lo mandé
          </button>
        </div>
        <p className="field-ayuda">El código vence en 15 minutos.</p>
      </>
    );
  } else {
    contenido = (
      <>
        <p className="whatsapp-paso">Mandale «café 2500» por WhatsApp y queda para confirmar en Movimientos.</p>
        <button type="button" className="btn btn-primary btn-alinear-inicio" disabled={!!trabajando} onClick={pedirCodigo}>
          <i className="ph ph-whatsapp-logo" aria-hidden="true" />
          {trabajando === "codigo" ? "Preparando…" : "Vincular WhatsApp"}
        </button>
      </>
    );
  }

  return (
    <section className="card" id="whatsapp" aria-labelledby="titulo-whatsapp">
      <h2 className="card-kicker titulo-con-info" id="titulo-whatsapp">
        Gastos por WhatsApp
        <Explicacion
          texto="Mandale al bot «café 2500», «uber 3.800 ayer» o «netflix usd 12», uno por línea. Quedan «Sin confirmar» en Movimientos y no suman hasta que los confirmes. Por ahora solo texto: audios y fotos, más adelante."
          etiqueta="Más info sobre los gastos por WhatsApp"
        />
      </h2>
      <div className="pila-chica" aria-live="polite">
        {contenido}
      </div>
    </section>
  );
}

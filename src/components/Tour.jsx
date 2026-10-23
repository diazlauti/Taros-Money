import { useEffect, useState } from "react";
import { mailsDisponible } from "../api";
import { estaInstalada } from "../instalacion";
import { playChime, playFestejo, playPaso, playSuccess } from "../sounds";
import { EVENTO_TOUR, marcarTourVisto } from "../tour";
import Dialog from "./Dialog";

// Cada paso puede llevar a una sección ("tab"): el recorrido la va abriendo
// detrás del cartel para que se vea de qué se habla.
const PASOS = [
  {
    tab: "resumen",
    icono: "ph ph-hand-waving",
    titulo: "¡Te damos la bienvenida!",
    texto: "Te mostramos en un par de minutos todo lo que podés hacer, con ejemplos. Podés saltearlo y verlo cuando quieras desde Configuración.",
  },
  {
    tab: "resumen",
    icono: "ph ph-squares-four",
    titulo: "Resumen",
    texto: "Tu saldo, cuánto gastaste e ingresaste y en qué categorías. Arriba elegís el período: 7, 14, 30 o 90 días.",
  },
  {
    tab: "resumen",
    icono: "ph ph-plus-circle",
    titulo: "Cargá tu primer movimiento",
    texto: "Tocá «Nuevo movimiento», arriba. Probá con algo chico, como un café: poné el monto, elegí una categoría y tocá «Guardar». Después lo borramos juntos.",
    espera: "movimiento-creado",
    objetivo: "nuevo-movimiento",
  },
  {
    tab: "movimientos",
    icono: "ph ph-confetti",
    titulo: "¡Bien hecho!",
    texto: "Tu movimiento ya está guardado en tu planilla. En Movimientos ves todo lo que cargaste, del más nuevo al más viejo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-trash",
    titulo: "Ahora borralo",
    texto: "Tocá el movimiento que acabás de cargar (es el primero de la lista) y después «Borrar». Así se corrige cualquier error.",
    espera: "movimiento-borrado",
    objetivo: "borrar",
  },
  {
    tab: "movimientos",
    icono: "ph ph-check-circle",
    titulo: "¡Perfecto!",
    texto: "Ya sabés cargar y borrar. Si te equivocás al borrar, abajo aparece «Deshacer» por unos segundos. Y si solo querés corregir algo, tocá el movimiento y cambialo, sin borrarlo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-lightning",
    titulo: "Cargá más rápido",
    texto: "Lo que cargás seguido (el café, la SUBE) aparece como atajo en «Tus gastos frecuentes»: un toque y queda todo completo. Con la app instalada, mantené apretado el ícono para ir directo a «Nuevo gasto».",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Cuentas",
    texto: "Efectivo, banco, billeteras virtuales: cada una con su saldo y su moneda. Con el lápiz le cambiás el nombre o la borrás.",
  },
  {
    tab: "metas",
    icono: "ph ph-target",
    titulo: "Metas",
    texto: "Ponete un objetivo de ahorro y andá sumando plata. Ejemplo: «Vacaciones» por $500.000; cada vez que guardás algo, tocás «Sumar aporte» y ves cuánto te falta.",
  },
  {
    tab: "servicios",
    icono: "ph ph-receipt",
    titulo: "Servicios",
    texto: "Las cuentas de todos los meses: luz, agua, internet, alquiler. Ejemplo: cargás «Luz», que vence el 10 y sale unos $25.000. Cuando la pagás tocás «Marcar pagado» y, si querés, se suma sola a tus gastos. Si algo está por vencer, te avisamos. En el celu está en «Más».",
  },
  {
    tab: "recurrentes",
    icono: "ph ph-repeat",
    titulo: "Suscripciones",
    texto: "Los pagos fijos que se cobran solos (streaming, gimnasio, la nube) y cuánto suman por mes. En el celu está en «Más».",
  },
  {
    tab: "reportes",
    icono: "ph ph-chart-line",
    titulo: "Reportes",
    texto: "Cómo vienen tus gastos e ingresos en los últimos meses. En el celu también está en «Más».",
  },
  {
    tab: "configuracion",
    icono: "ph ph-envelope-simple",
    titulo: "Gastos desde tus mails",
    texto: "Para no cargar a mano lo que ya pagaste: buscamos en tu Gmail los pagos (Mercado Pago y tus bancos) y aparecen en Movimientos como «A revisar». Ejemplo: pagás $8.500 en la farmacia con Mercado Pago; aparece solo, elegís la categoría y confirmás. Acá elegís cuándo revisarlos.",
    seccion: "titulo-mails",
    soloConMails: true,
  },
  {
    tab: "configuracion",
    icono: "ph ph-currency-dollar",
    titulo: "Otras monedas",
    texto: "¿Tenés dólares o ahorrás en euros? Activá la moneda y elegí la cotización: automática (oficial, blue, MEP o tarjeta) o una fija. Ejemplo: una cuenta «Ahorro» en USD y en el Resumen ves tu saldo total en pesos.",
    seccion: "titulo-monedas",
  },
  {
    tab: "configuracion",
    icono: "ph ph-gear",
    titulo: "Configuración",
    texto: "Tu planilla de Google, tus categorías, tema claro u oscuro y sonidos. Desde acá podés volver a ver este recorrido.",
    seccion: "titulo-planilla",
  },
];

const PASO_INSTALAR = {
  icono: "ph ph-device-mobile",
  titulo: "Tenela a mano",
  texto: "Agregá Taros Money a la pantalla de inicio de tu celu y abrila con un toque, como cualquier app.",
};

// Recorrido de primera vez. Se marca como visto al terminarlo o saltearlo
// (también con Esc), así no vuelve a aparecer solo.
export default function Tour({ onIrA, onInstalar, onClose }) {
  // El paso de mails solo aparece si esta versión de la app los puede leer.
  const [pasos] = useState(() => {
    const base = PASOS.filter((p) => !p.soloConMails || mailsDisponible());
    return estaInstalada() ? base : [...base, PASO_INSTALAR];
  });
  const [indice, setIndice] = useState(0);
  // Para animar el paso nuevo entrando desde el lado correcto.
  const [direccion, setDireccion] = useState("adelante");
  const paso = pasos[indice];
  const esUltimo = indice === pasos.length - 1;

  useEffect(() => {
    playChime();
  }, []);

  // Pasos que hablan de una parte de la sección (ej. Monedas, en
  // Configuración): la acerca para que se vea detrás del cartel.
  useEffect(() => {
    if (!paso.seccion) return undefined;
    const t = setTimeout(() => {
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document
        .getElementById(paso.seccion)
        ?.closest("section, .card")
        ?.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [paso]);

  // Pasos de práctica: se resalta lo que hay que tocar y se espera a que la
  // persona lo haga de verdad; cuando pasa, avanza solo.
  useEffect(() => {
    if (!paso.espera) return undefined;
    const raiz = document.documentElement;
    raiz.dataset.tourObjetivo = paso.objetivo;
    const enfocar = setTimeout(() => {
      const selector = paso.objetivo === "borrar" ? '[data-tour="primer-movimiento"]' : `[data-tour="${paso.objetivo}"]`;
      document.querySelector(selector)?.focus();
    }, 300);

    function onAccion(e) {
      if (e.detail !== paso.espera) return;
      playSuccess();
      setDireccion("adelante");
      setIndice((i) => i + 1);
      const siguiente = pasos[indice + 1];
      if (siguiente?.tab) onIrA(siguiente.tab);
    }
    window.addEventListener(EVENTO_TOUR, onAccion);
    return () => {
      clearTimeout(enfocar);
      window.removeEventListener(EVENTO_TOUR, onAccion);
      delete raiz.dataset.tourObjetivo;
    };
  }, [paso, pasos, indice, onIrA]);

  function irA(nuevo) {
    const atras = nuevo < indice;
    setDireccion(atras ? "atras" : "adelante");
    setIndice(nuevo);
    if (nuevo === pasos.length - 1 && !atras) playFestejo();
    else playPaso(nuevo, atras);
    if (pasos[nuevo].tab) onIrA(pasos[nuevo].tab);
  }

  function cerrar() {
    marcarTourVisto();
    onClose();
  }

  function instalar() {
    marcarTourVisto();
    onInstalar();
  }

  const puntos = (
    <div className="tour-puntos" aria-hidden="true">
      {pasos.map((p, i) => (
        <span key={p.titulo} className={"tour-punto" + (i === indice ? " tour-punto--activo" : i < indice ? " tour-punto--hecho" : "")} />
      ))}
    </div>
  );

  // Paso de práctica: cartel que no tapa la pantalla (no es modal), para
  // poder tocar la app de verdad.
  if (paso.espera) {
    return (
      <section className="tour-coach" aria-labelledby="tour-coach-titulo">
        <div key={indice} className="tour-cuerpo tour-cuerpo--adelante">
          <span className="tour-icono">
            <i className={paso.icono} aria-hidden="true" />
          </span>
          <div className="pila-chica">
            <span className="tour-coach-etiqueta">Practicá</span>
            <h2 className="dialog-title" id="tour-coach-titulo">
              {paso.titulo}
            </h2>
            <p className="tour-texto">{paso.texto}</p>
          </div>
        </div>
        {puntos}
        <p className="visualmente-oculto" aria-live="polite">
          Paso {indice + 1} de {pasos.length}: {paso.titulo}. {paso.texto}
        </p>
        <div className="fila-separada">
          <span className="tour-esperando">
            <i className="ph ph-hourglass-medium" aria-hidden="true" />
            Esperando que lo hagas…
          </span>
          <button type="button" className="btn btn-texto" onClick={cerrar}>
            Saltear recorrido
          </button>
        </div>
      </section>
    );
  }

  // No se puede volver a un paso de práctica ya hecho (habría que repetirlo).
  const puedeVolver = indice > 0 && !pasos[indice - 1].espera;

  return (
    <Dialog titulo={paso.titulo} onClose={cerrar} variante="tour">
      <div key={indice} className={`tour-cuerpo tour-cuerpo--${direccion}`}>
        <span
          className={
            "tour-icono" + (indice % 2 === 1 ? " tour-icono--mostaza" : "") + (indice === 0 ? " tour-icono--saludo" : "")
          }
        >
          <i className={paso.icono} aria-hidden="true" />
          {esUltimo && (
            <span className="tour-confeti" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} style={{ "--i": i }} />
              ))}
            </span>
          )}
        </span>
        <p className="tour-texto">{paso.texto}</p>
      </div>

      {puntos}
      <p className="visualmente-oculto" aria-live="polite">
        Paso {indice + 1} de {pasos.length}: {paso.titulo}. {paso.texto}
      </p>

      <div className="dialog-actions dialog-actions--separadas">
        {esUltimo ? (
          <button type="button" className="btn btn-texto" onClick={cerrar}>
            {paso === PASO_INSTALAR ? "Ahora no" : "Cerrar"}
          </button>
        ) : (
          <button type="button" className="btn btn-texto" onClick={cerrar}>
            Saltear
          </button>
        )}
        <div className="fila">
          {puedeVolver && (
            <button type="button" className="btn btn-secondary" onClick={() => irA(indice - 1)}>
              <i className="ph ph-arrow-left" aria-hidden="true" />
              <span className="visualmente-oculto">Anterior</span>
            </button>
          )}
          {esUltimo ? (
            paso === PASO_INSTALAR ? (
              <button type="button" className="btn btn-primary" onClick={instalar}>
                Ver cómo
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={cerrar}>
                ¡Listo!
              </button>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => irA(indice + 1)} data-autofocus>
              {indice === 0 ? "Empezar" : "Siguiente"}
              <i className="ph ph-arrow-right" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

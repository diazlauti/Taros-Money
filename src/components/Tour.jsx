import { useEffect, useState } from "react";
import { mailsDisponible } from "../api";
import { estaInstalada } from "../instalacion";
import { playChime, playFestejo, playPaso, playSuccess } from "../sounds";
import { buscarObjetivo, EVENTO_TOUR, marcarTourVisto } from "../tour";
import Dialog from "./Dialog";
import TourFoco from "./TourFoco";

// Cada paso puede llevar a una sección ("tab"): el recorrido la va abriendo
// detrás del cartel para que se vea de qué se habla. "resaltar" dice qué
// botones o partes de la pantalla se iluminan (el resto queda oscuro y no
// se puede tocar); ver TourFoco para el formato.
const PASOS = [
  {
    tab: "resumen",
    icono: "ph ph-hand-waving",
    titulo: "¡Te damos la bienvenida!",
    texto: "Te mostramos en un par de minutos todo lo que podés hacer, con ejemplos. Después lo podés volver a ver cuando quieras desde Configuración.",
  },
  {
    tab: "resumen",
    icono: "ph ph-squares-four",
    titulo: "Resumen",
    resaltar: ["nav:resumen", '[data-tour="periodo"]'],
    texto: "Tu saldo, cuánto gastaste e ingresaste y en qué categorías. Arriba elegís el período: 7, 14, 30 o 90 días.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Primero, tu cuenta",
    resaltar: ['[data-tour="nueva-cuenta"]'],
    texto: "Cada gasto sale de una cuenta. Creá la que más usás (efectivo, banco, Mercado Pago) con la plata que tenés hoy y tocá «Agregar».",
    espera: "cuenta-creada",
    objetivo: "nueva-cuenta",
    // Sin cuenta no se puede cargar nada: este paso no se saltea. Si ya
    // tenés alguna, no aparece.
    obligatorio: true,
    soloSinCuentas: true,
  },
  {
    tab: "resumen",
    icono: "ph ph-plus-circle",
    titulo: "Cargá tu primer movimiento",
    resaltar: ['[data-tour="nuevo-movimiento"]'],
    texto: "Tocá «Nuevo movimiento» (en el celu dice «Nuevo»), arriba. Probá con algo chico, como un café: poné el monto, elegí una categoría y tocá «Guardar». Después lo borramos juntos.",
    espera: "movimiento-creado",
    objetivo: "nuevo-movimiento",
  },
  {
    tab: "movimientos",
    icono: "ph ph-confetti",
    titulo: "¡Bien hecho!",
    resaltar: ["nav:movimientos", '[data-tour="primer-movimiento"]'],
    texto: "Tu movimiento ya está guardado en tu planilla. En Movimientos ves todo lo que cargaste, del más nuevo al más viejo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-trash",
    titulo: "Ahora borralo",
    resaltar: ['[data-tour="primer-movimiento"]'],
    texto: "Tocá el movimiento que acabás de cargar (es el primero de la lista) y después «Borrar». Así se corrige cualquier error.",
    espera: "movimiento-borrado",
    objetivo: "borrar",
  },
  {
    tab: "movimientos",
    icono: "ph ph-check-circle",
    titulo: "¡Perfecto!",
    resaltar: ["nav:movimientos"],
    texto: "Ya sabés cargar y borrar. Si te equivocás al borrar, abajo aparece «Deshacer» por unos segundos. Y si solo querés corregir algo, tocá el movimiento y cambialo, sin borrarlo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-lightning",
    titulo: "Cargá más rápido",
    resaltar: ['[data-tour="nuevo-movimiento"]'],
    texto: "Lo que cargás seguido (el café, la SUBE) aparece como atajo en «Tus gastos frecuentes»: un toque y queda todo completo. Con la app instalada, mantené apretado el ícono para ir directo a «Nuevo gasto».",
  },
  {
    tab: "movimientos",
    icono: "ph ph-bell",
    titulo: "Notificaciones",
    resaltar: ['[data-tour="campana"]'],
    texto: "La campanita de arriba junta lo que tenés para hacer: mails para revisar, servicios por vencer y suscripciones que se cobran pronto. En «Novedades» ves lo nuevo de la app. El número te dice cuántas cosas no viste.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Cuentas",
    resaltar: ["nav:cuentas", ".tab-pane .card"],
    texto: "Efectivo, banco, billeteras virtuales: cada una con su saldo y su moneda. Con el lápiz le cambiás el nombre o la borrás.",
  },
  {
    tab: "metas",
    icono: "ph ph-target",
    titulo: "Metas",
    resaltar: ["nav:metas", ".tab-pane .card"],
    texto: "Ponete un objetivo de ahorro y andá sumando plata. Ejemplo: «Vacaciones» por $500.000; cada vez que guardás algo, tocás «Sumar aporte» y ves cuánto te falta.",
  },
  {
    tab: "servicios",
    icono: "ph ph-receipt",
    titulo: "Servicios",
    resaltar: ["nav:servicios", '[data-tour="elegir-servicios"]', ".tab-pane .card"],
    texto: "Las cuentas de todos los meses: luz, agua, internet, alquiler. Ejemplo: cargás «Luz», que vence el 10 y sale unos $25.000. Cuando la pagás tocás «Marcar pagado» y, si querés, se suma sola a tus gastos. Si algo está por vencer, te avisamos.",
  },
  {
    tab: "recurrentes",
    icono: "ph ph-repeat",
    titulo: "Suscripciones",
    resaltar: ["nav:servicios", '[data-tour="elegir-recurrentes"]', ".tab-pane .card"],
    texto: "Los pagos fijos que se cobran solos (streaming, gimnasio, la nube) y cuánto suman por mes. Están junto a Servicios: arriba elegís cuál ver. En el celu, «Servicios y subs» está en «Más».",
  },
  {
    tab: "reportes",
    icono: "ph ph-chart-line",
    titulo: "Reportes",
    resaltar: ["nav:reportes", ".tab-pane .card"],
    texto: "Cómo vienen tus gastos e ingresos en los últimos meses. En el celu también está en «Más».",
  },
  {
    tab: "calculadora",
    icono: "ph ph-calculator",
    titulo: "Calculadora de impuestos",
    resaltar: ["nav:calculadora", "card:#titulo-calculadora"],
    texto: "Cuánto termina saliendo en pesos algo que pagás en otra moneda o con impuestos encima. Ejemplo: una compra de US$ 20 en una app; ves el total con los impuestos y, si querés, la cargás como gasto. En el celu está en «Más».",
  },
  {
    tab: "configuracion",
    icono: "ph ph-envelope-simple",
    titulo: "Gastos desde tus mails",
    resaltar: ["nav:configuracion", "card:#titulo-mails"],
    texto: "Para no cargar a mano lo que ya pagaste: buscamos en tu Gmail los pagos (Mercado Pago y tus bancos) y aparecen en Movimientos como «A revisar». Ejemplo: pagás $8.500 en la farmacia con Mercado Pago; aparece solo, elegís la categoría y confirmás. Acá elegís cuándo revisarlos.",
    soloConMails: true,
  },
  {
    tab: "configuracion",
    icono: "ph ph-currency-dollar",
    titulo: "Otras monedas",
    resaltar: ["nav:configuracion", "card:#titulo-monedas"],
    texto: "¿Tenés dólares o ahorrás en euros? Activá la moneda y elegí la cotización: automática (oficial, blue, MEP o tarjeta) o una fija. Ejemplo: una cuenta «Ahorro» en USD y en el Resumen ves tu saldo total en pesos.",
  },
  {
    tab: "configuracion",
    icono: "ph ph-gear",
    titulo: "Configuración",
    resaltar: ["nav:configuracion", "card:#titulo-planilla"],
    texto: "Tu planilla de Google, tus categorías (con su ícono), tema claro u oscuro y sonidos. Desde acá podés volver a ver este recorrido.",
  },
];

// Si se saltea una práctica, algunos pasos dejan de tener sentido (no se
// puede festejar un movimiento que no se cargó) o cambian el texto.
const SALTEO = {
  "movimiento-creado": { saltarHasta: "movimiento-borrado", etiqueta: "Saltear este paso" },
  "movimiento-borrado": { saltarHasta: null, etiqueta: "Dejarlo así" },
};
const TEXTO_SI_NO_BORRO = {
  "¡Perfecto!":
    "Listo, el movimiento de prueba queda guardado. Si después lo querés sacar, tocalo en Movimientos y «Borrar». Y si solo querés corregir algo, tocalo y cambialo, sin borrarlo.",
};
// Segundos que hay que esperar antes de poder saltear una práctica: así se
// intenta primero, pero nadie queda trabado.
const ESPERA_SALTEO_S = 5;
// En los pasos que se leen, «Siguiente» se habilita recién después de este
// tiempo: así no se pasa todo de un tirón sin leer.
const ESPERA_LECTURA_S = 3;
// Cuántos puntitos de progreso se ven a la vez.
const PUNTOS_VISIBLES = 5;

const PASO_INSTALAR = {
  icono: "ph ph-device-mobile",
  titulo: "Tenela a mano",
  texto: "Agregá Taros Money a la pantalla de inicio de tu celu y abrila con un toque, como cualquier app.",
};

// Recorrido de primera vez. Se marca como visto al terminarlo o saltearlo
// (también con Esc), así no vuelve a aparecer solo.
// La primera vez no se puede saltear (ni con Esc): solo quien lo abre de
// nuevo desde Configuración tiene «Saltear».
export default function Tour({ hayCuentas, sePuedeSaltear = false, onIrA, onInstalar, onClose }) {
  // El paso de mails solo aparece si esta versión de la app los puede leer.
  const [pasos] = useState(() => {
    const base = PASOS.filter((p) => !p.soloConMails || mailsDisponible());
    return estaInstalada() ? base : [...base, PASO_INSTALAR];
  });
  const [indice, setIndice] = useState(0);
  // Para animar el paso nuevo entrando desde el lado correcto.
  const [direccion, setDireccion] = useState("adelante");
  // Las prácticas que se saltearon (para ajustar los textos que siguen).
  const [salteadas, setSalteadas] = useState(() => new Set());
  // En qué paso de práctica ya pasó la espera y se puede saltear.
  const [salteableEn, setSalteableEn] = useState(-1);
  // Después de saltear no se vuelve a los pasos que se pasaron de largo.
  const [piso, setPiso] = useState(0);
  const paso = pasos[indice];
  const textoPaso = (salteadas.has("movimiento-borrado") && TEXTO_SI_NO_BORRO[paso.titulo]) || paso.texto;
  const esUltimo = indice === pasos.length - 1;

  useEffect(() => {
    playChime();
  }, []);

  // Lo que muestra el paso queda resaltado (ver TourFoco). Si es una parte
  // de la sección que quedó fuera de la vista, se acerca para que se vea
  // por encima del cartel.
  const resaltar = paso.resaltar || [];
  const claveResaltar = resaltar.join("|");
  useEffect(() => {
    const raiz = document.documentElement;
    if (!claveResaltar) {
      delete raiz.dataset.tourFoco;
      return undefined;
    }
    raiz.dataset.tourFoco = "";
    const t = setTimeout(() => {
      const contenido = claveResaltar
        .split("|")
        .filter((o) => !o.startsWith("nav:"))
        .map(buscarObjetivo)
        .find(Boolean);
      if (!contenido) return;
      const r = contenido.getBoundingClientRect();
      // Arriba de la pantalla (donde no lo tapa el cartel) ya se ve bien.
      if (r.top >= 0 && r.top < window.innerHeight * 0.4) return;
      const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      contenido.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [claveResaltar]);
  useEffect(() => () => delete document.documentElement.dataset.tourFoco, []);

  // Pasos de práctica: se resalta lo que hay que tocar y se espera a que la
  // persona lo haga de verdad; cuando pasa, avanza solo.
  useEffect(() => {
    if (!paso.espera) return undefined;
    const raiz = document.documentElement;
    raiz.dataset.tourObjetivo = paso.objetivo;
    const enfocar = setTimeout(() => {
      const selector =
        paso.objetivo === "borrar" ? '[data-tour="primer-movimiento"]' : `[data-tour="${paso.objetivo}"]`;
      const el = document.querySelector(selector);
      if (el?.matches("form")) {
        // Un formulario entero: se sube arriba de todo para que el cartel no
        // tape el botón, y se arranca por el primer campo.
        el.querySelector("input")?.focus({ preventScroll: true });
        const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ block: "start", behavior: quieto ? "auto" : "smooth" });
      } else {
        el?.focus();
      }
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

  // Después de unos segundos en una práctica aparece la opción de saltearla.
  useEffect(() => {
    if (!paso.espera) return undefined;
    const t = setTimeout(() => setSalteableEn(indice), ESPERA_SALTEO_S * 1000);
    return () => clearTimeout(t);
  }, [paso, indice]);
  const puedeSaltear = paso.espera && !paso.obligatorio && salteableEn === indice;

  // En qué paso de lectura ya se puede seguir.
  const [leidoEn, setLeidoEn] = useState(-1);
  useEffect(() => {
    if (paso.espera) return undefined;
    const t = setTimeout(() => setLeidoEn(indice), ESPERA_LECTURA_S * 1000);
    return () => clearTimeout(t);
  }, [paso, indice]);
  const puedeSeguir = leidoEn === indice;

  // Saltear una práctica: sigue con el paso que corresponda sin obligar a
  // cargar ni a borrar nada.
  function saltearPractica() {
    const regla = SALTEO[paso.espera] || {};
    let destino = indice + 1;
    if (regla.saltarHasta) {
      const fin = pasos.findIndex((p, i) => i > indice && p.espera === regla.saltarHasta);
      // También se saltea el festejo de después ("¡Perfecto!"), que habla de algo que no se hizo.
      if (fin !== -1) destino = fin + 2;
    }
    destino = Math.min(destino, pasos.length - 1);
    setSalteadas((s) => new Set([...s, paso.espera, regla.saltarHasta].filter(Boolean)));
    setDireccion("adelante");
    setIndice(destino);
    setPiso(destino);
    playPaso(destino, false);
    if (pasos[destino].tab) onIrA(pasos[destino].tab);
  }

  function irA(nuevo) {
    // El paso de crear cuenta no hace falta si ya tenés una.
    if (nuevo > indice && pasos[nuevo]?.soloSinCuentas && hayCuentas) nuevo++;
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

  // Puntitos como las historias de Instagram: se ven unos pocos alrededor
  // del paso actual y se van corriendo. Así no se ve de entrada cuántos
  // pasos son en total (y suman secciones sin que el recorrido asuste).
  // Los de las puntas, si hay más para ese lado, quedan más chiquitos.
  const desde = Math.max(0, Math.min(indice - Math.floor(PUNTOS_VISIBLES / 2), pasos.length - PUNTOS_VISIBLES));
  const hasta = Math.min(pasos.length, desde + PUNTOS_VISIBLES);
  const puntos = (
    <div className="tour-puntos" aria-hidden="true">
      {pasos.slice(desde, hasta).map((p, j) => {
        const i = desde + j;
        const chico = (j === 0 && desde > 0) || (i === hasta - 1 && hasta < pasos.length);
        return (
          <span
            key={i}
            className={
              "tour-punto" +
              (i === indice ? " tour-punto--activo" : i < indice ? " tour-punto--hecho" : "") +
              (chico ? " tour-punto--chico" : "")
            }
          />
        );
      })}
    </div>
  );
  const foco = resaltar.length > 0 && <TourFoco objetivos={resaltar} />;

  // Paso de práctica: cartel que no tapa la pantalla (no es modal), para
  // poder tocar la app de verdad.
  if (paso.espera) {
    return (
      <>
        {foco}
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
            Paso {indice + 1}: {paso.titulo}. {paso.texto}
          </p>
          <div className="fila-separada">
            {!puedeSaltear ? (
              <span className="tour-esperando">
                <i className="ph ph-hourglass-medium" aria-hidden="true" />
                Esperando que lo hagas…
              </span>
            ) : (
              <button type="button" className="btn btn-secondary tour-saltear-paso" onClick={saltearPractica}>
                {(SALTEO[paso.espera] || {}).etiqueta || "Saltear este paso"}
                <i className="ph ph-arrow-right" aria-hidden="true" />
              </button>
            )}
            {sePuedeSaltear && (
              <button type="button" className="btn btn-texto" onClick={cerrar}>
                Saltear recorrido
              </button>
            )}
          </div>
          <p className="visualmente-oculto" aria-live="polite">
            {puedeSaltear ? "Si preferís, podés seguir sin hacerlo." : ""}
          </p>
        </section>
      </>
    );
  }

  // No se puede volver a un paso de práctica ya hecho (habría que repetirlo).
  const puedeVolver = indice > piso && !pasos[indice - 1].espera;

  return (
    <>
      {foco}
      <Dialog titulo={paso.titulo} onClose={sePuedeSaltear || esUltimo ? cerrar : () => {}} variante="tour">
        <div key={indice} className={`tour-cuerpo tour-cuerpo--${direccion}`}>
          <span
            className={
              "tour-icono" +
              (indice % 2 === 1 ? " tour-icono--mostaza" : "") +
              (indice === 0 ? " tour-icono--saludo" : "")
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
          <p className="tour-texto">{textoPaso}</p>
        </div>

        {puntos}
        <p className="visualmente-oculto" aria-live="polite">
          Paso {indice + 1}: {paso.titulo}. {textoPaso}
        </p>

        <div className="dialog-actions dialog-actions--separadas">
          {esUltimo ? (
            <button type="button" className="btn btn-texto" onClick={cerrar}>
              {paso === PASO_INSTALAR ? "Ahora no" : "Cerrar"}
            </button>
          ) : sePuedeSaltear ? (
            <button type="button" className="btn btn-texto" onClick={cerrar}>
              Saltear
            </button>
          ) : (
            <span />
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
                <button
                  type="button"
                  className={"btn btn-primary" + (puedeSeguir ? "" : " btn-esperando")}
                  onClick={() => puedeSeguir && instalar()}
                  aria-disabled={!puedeSeguir}
                >
                  Ver cómo
                </button>
              ) : (
                <button
                  type="button"
                  className={"btn btn-primary" + (puedeSeguir ? "" : " btn-esperando")}
                  onClick={() => puedeSeguir && cerrar()}
                  aria-disabled={!puedeSeguir}
                >
                  ¡Listo!
                </button>
              )
            ) : (
              <button
                type="button"
                className={"btn btn-primary" + (puedeSeguir ? "" : " btn-esperando")}
                onClick={() => puedeSeguir && irA(indice + 1)}
                aria-disabled={!puedeSeguir}
                data-autofocus
              >
                {indice === 0 ? "Empezar" : "Siguiente"}
                <i className="ph ph-arrow-right" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

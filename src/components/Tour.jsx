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
    texto: "Te mostramos en un minuto todo lo que podés hacer. Lo podés volver a ver desde Configuración.",
  },
  {
    tab: "resumen",
    icono: "ph ph-squares-four",
    titulo: "Resumen",
    resaltar: ["nav:resumen", '[data-tour="periodo"]'],
    texto: "Tu saldo, lo que gastaste y en qué. Arriba elegís el período.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Primero, tu cuenta",
    resaltar: ['[data-tour="nueva-cuenta"]'],
    texto: "Todo gasto sale de una cuenta. Creá la que más usás con la plata que tenés hoy y tocá «Agregar».",
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
    texto: "Tocá «Nuevo», cargá algo chico (un café) y tocá «Guardar». Después lo borramos.",
    espera: "movimiento-creado",
    objetivo: "nuevo-movimiento",
  },
  {
    tab: "movimientos",
    icono: "ph ph-confetti",
    titulo: "¡Bien hecho!",
    resaltar: ["nav:movimientos", '[data-tour="primer-movimiento"]'],
    texto: "Ya está guardado. Acá ves todo lo que cargaste.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-trash",
    titulo: "Ahora borralo",
    resaltar: ['[data-tour="primer-movimiento"]'],
    texto: "Tocá el movimiento que cargaste y después «Borrar».",
    espera: "movimiento-borrado",
    objetivo: "borrar",
  },
  {
    tab: "movimientos",
    icono: "ph ph-check-circle",
    titulo: "¡Perfecto!",
    resaltar: ["nav:movimientos"],
    texto: "Si borrás algo por error, tocá «Deshacer» abajo. Para corregir, tocá el movimiento y cambialo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-lightning",
    titulo: "Cargá más rápido",
    resaltar: ['[data-tour="nuevo-movimiento"]'],
    texto: "Lo que cargás seguido aparece como atajo en «Nuevo»: un toque y listo.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-bell",
    titulo: "Notificaciones",
    resaltar: ['[data-tour="campana"]'],
    texto: "La campanita junta lo pendiente (mails, servicios por vencer, subs) y las novedades de la app.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Cuentas",
    resaltar: ["nav:cuentas", ".tab-pane .card"],
    texto: "Cada cuenta con su saldo y su moneda. Con el lápiz la editás o la borrás.",
  },
  {
    tab: "metas",
    icono: "ph ph-target",
    titulo: "Metas",
    resaltar: ["nav:metas", ".tab-pane .card"],
    texto: "Ponete un objetivo de ahorro y sumale plata de a poco.",
  },
  {
    tab: "servicios",
    icono: "ph ph-receipt",
    titulo: "Servicios",
    resaltar: ["nav:servicios", '[data-tour="elegir-servicios"]', ".tab-pane .card"],
    texto: "Luz, agua, alquiler: cuándo vencen y cuánto salen. Tocá «Marcar pagado» y se suma a tus gastos.",
  },
  {
    tab: "recurrentes",
    icono: "ph ph-repeat",
    titulo: "Suscripciones",
    resaltar: ["nav:servicios", '[data-tour="elegir-recurrentes"]', ".tab-pane .card"],
    texto: "Lo que se cobra solo (streaming, gimnasio) y cuánto suma por mes.",
  },
  {
    tab: "reportes",
    icono: "ph ph-chart-line",
    titulo: "Reportes",
    resaltar: ["nav:reportes", ".tab-pane .card"],
    texto: "Cómo vienen tus gastos e ingresos mes a mes.",
  },
  {
    tab: "calculadora",
    icono: "ph ph-calculator",
    titulo: "Calculadora de impuestos",
    resaltar: ["nav:calculadora", "card:#titulo-calculadora"],
    texto: "Cuánto sale en pesos algo en otra moneda o con impuestos encima.",
  },
  {
    tab: "configuracion",
    icono: "ph ph-envelope-simple",
    titulo: "Gastos desde tus mails",
    resaltar: ["nav:configuracion", "card:#titulo-mails"],
    texto: "Buscamos tus pagos en Gmail (Mercado Pago y bancos) y aparecen en Movimientos para que los confirmes.",
    soloConMails: true,
  },
  {
    tab: "configuracion",
    icono: "ph ph-currency-dollar",
    titulo: "Otras monedas",
    resaltar: ["nav:configuracion", "card:#titulo-monedas"],
    texto: "¿Tenés dólares o euros? Activá la moneda y elegí la cotización: automática o fija.",
  },
  {
    tab: "configuracion",
    icono: "ph ph-gear",
    titulo: "Configuración",
    resaltar: ["nav:configuracion", "cerrado:.config-grupos"],
    texto: "Todo ordenado en grupos: tocá uno para abrirlo. En «Ayuda» volvés a ver este recorrido.",
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
    "Listo, el movimiento de prueba queda guardado. Si lo querés sacar, tocalo en Movimientos y «Borrar».",
};
// Segundos que hay que esperar antes de poder saltear una práctica: así se
// intenta primero, pero nadie queda trabado.
const ESPERA_SALTEO_S = 5;
// En los pasos que se leen, «Siguiente» se habilita recién después de este
// tiempo: así no se pasa todo de un tirón sin leer.
const ESPERA_LECTURA_S = 3;
// Cuántos puntitos de progreso se ven a la vez.
const PUNTOS_VISIBLES = 5;

// Lo que hay que tocar en cada práctica. Para borrar, primero se toca el
// movimiento (el «Borrar» está en el diálogo que se abre).
function selectorObjetivo(objetivo) {
  return objetivo === "borrar" ? '[data-tour="primer-movimiento"]' : `[data-tour="${objetivo}"]`;
}

const PASO_INSTALAR = {
  icono: "ph ph-device-mobile",
  titulo: "Tenela a mano",
  texto: "Agregá Taros Money a tu pantalla de inicio y abrila como cualquier app.",
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
      const el = document.querySelector(selectorObjetivo(paso.objetivo));
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

    // Mientras se espera, solo se puede tocar lo que pide el paso: lo oscuro
    // ya frena los toques, pero dentro del hueco puede haber otros botones
    // (ej. «¿Otra moneda?» en el formulario de la cuenta) y con el teclado
    // se llega a cualquier lado. Eso te sacaba de la práctica.
    function sePuedeTocar(el) {
      if (!(el instanceof Element)) return false;
      // El cartel del recorrido y lo que abre la práctica (ej. «Nuevo
      // movimiento», «¿Seguro?»).
      if (el.closest(".tour-coach, .dialog-backdrop:not(.dialog-backdrop--tour)")) return true;
      const objetivo = el.closest(selectorObjetivo(paso.objetivo));
      if (!objetivo) return false;
      // En un formulario, solo sus campos y el botón de enviarlo.
      if (!objetivo.matches("form")) return true;
      const accion = el.closest("a, button, [role='button']");
      return !accion || (accion.matches("button") && accion.type === "submit");
    }
    function frenarToque(e) {
      if (sePuedeTocar(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    }
    // Con Tab: si el foco se va afuera, vuelve a lo que hay que tocar.
    function frenarFoco(e) {
      if (sePuedeTocar(e.target)) return;
      const objetivo = buscarObjetivo(selectorObjetivo(paso.objetivo));
      const destino = objetivo?.matches("form") ? objetivo.querySelector("input, select, button[type='submit']") : objetivo;
      if (destino && sePuedeTocar(destino)) destino.focus({ preventScroll: true });
      else e.target.blur?.();
    }
    document.addEventListener("click", frenarToque, true);
    document.addEventListener("focusin", frenarFoco, true);
    return () => {
      clearTimeout(enfocar);
      window.removeEventListener(EVENTO_TOUR, onAccion);
      document.removeEventListener("click", frenarToque, true);
      document.removeEventListener("focusin", frenarFoco, true);
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

import { useEffect, useState } from "react";
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
    texto: "Te mostramos en un minuto dónde está cada cosa. Podés saltearlo y verlo cuando quieras desde Configuración.",
  },
  {
    tab: "resumen",
    icono: "ph ph-squares-four",
    titulo: "Resumen",
    texto: "Tu saldo, cuánto gastaste e ingresaste y en qué categorías. Arriba elegís el período: 7, 14, 30 o 90 días.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Primero, tu cuenta",
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
    texto: "Ya sabés cargar y borrar. Si solo querés corregir algo, tocá el movimiento y cambiá lo que necesites, sin borrarlo.",
  },
  {
    tab: "cuentas",
    icono: "ph ph-wallet",
    titulo: "Cuentas",
    texto: "Efectivo, banco, billeteras virtuales: cada una con su saldo y su moneda.",
  },
  {
    tab: "metas",
    icono: "ph ph-target",
    titulo: "Metas",
    texto: "Ponete un objetivo de ahorro y andá sumando plata para ver cuánto te falta.",
  },
  {
    tab: "recurrentes",
    icono: "ph ph-repeat",
    titulo: "Suscripciones",
    texto: "Los pagos fijos de todos los meses (streaming, gimnasio, servicios) y cuánto suman. En el celu está en «Más».",
  },
  {
    tab: "reportes",
    icono: "ph ph-chart-line",
    titulo: "Reportes",
    texto: "Cómo vienen tus gastos e ingresos en los últimos meses. En el celu también está en «Más».",
  },
  {
    tab: "configuracion",
    icono: "ph ph-gear",
    titulo: "Configuración",
    texto: "Abrí tu planilla de Google, manejá tus categorías y elegí tema claro u oscuro. Desde acá podés volver a ver este recorrido.",
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

const PASO_INSTALAR = {
  icono: "ph ph-device-mobile",
  titulo: "Tenela a mano",
  texto: "Agregá Taros Money a la pantalla de inicio de tu celu y abrila con un toque, como cualquier app.",
};

// Recorrido de primera vez. Se marca como visto al terminarlo o saltearlo
// (también con Esc), así no vuelve a aparecer solo.
export default function Tour({ hayCuentas, onIrA, onInstalar, onClose }) {
  const [pasos] = useState(() => (estaInstalada() ? PASOS : [...PASOS, PASO_INSTALAR]));
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

  // Pasos de práctica: se resalta lo que hay que tocar y se espera a que la
  // persona lo haga de verdad; cuando pasa, avanza solo.
  useEffect(() => {
    if (!paso.espera) return undefined;
    const raiz = document.documentElement;
    raiz.dataset.tourObjetivo = paso.objetivo;
    const enfocar = setTimeout(() => {
      const selector = paso.objetivo === "borrar" ? '[data-tour="primer-movimiento"]' : `[data-tour="${paso.objetivo}"]`;
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
          <button type="button" className="btn btn-texto" onClick={cerrar}>
            Saltear recorrido
          </button>
        </div>
        <p className="visualmente-oculto" aria-live="polite">
          {puedeSaltear ? "Si preferís, podés seguir sin hacerlo." : ""}
        </p>
      </section>
    );
  }

  // No se puede volver a un paso de práctica ya hecho (habría que repetirlo).
  const puedeVolver = indice > piso && !pasos[indice - 1].espera;

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
        <p className="tour-texto">{textoPaso}</p>
      </div>

      {puntos}
      <p className="visualmente-oculto" aria-live="polite">
        Paso {indice + 1} de {pasos.length}: {paso.titulo}. {textoPaso}
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

import { useState } from "react";
import { estaInstalada } from "../instalacion";
import { marcarTourVisto } from "../tour";
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
    tab: "resumen",
    icono: "ph ph-plus-circle",
    titulo: "Cargar un movimiento",
    texto: "Con el botón «Nuevo movimiento», arriba de todo, anotás un gasto o un ingreso. Está siempre a mano en todas las secciones.",
  },
  {
    tab: "movimientos",
    icono: "ph ph-list-bullets",
    titulo: "Movimientos",
    texto: "Todo lo que cargaste, del más nuevo al más viejo. Tocá uno para corregirlo o borrarlo.",
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

const PASO_INSTALAR = {
  icono: "ph ph-device-mobile",
  titulo: "Tenela a mano",
  texto: "Agregá Taros Money a la pantalla de inicio de tu celu y abrila con un toque, como cualquier app.",
};

// Recorrido de primera vez. Se marca como visto al terminarlo o saltearlo
// (también con Esc), así no vuelve a aparecer solo.
export default function Tour({ onIrA, onInstalar, onClose }) {
  const [pasos] = useState(() => (estaInstalada() ? PASOS : [...PASOS, PASO_INSTALAR]));
  const [indice, setIndice] = useState(0);
  const paso = pasos[indice];
  const esUltimo = indice === pasos.length - 1;

  function irA(nuevo) {
    setIndice(nuevo);
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

  return (
    <Dialog titulo={paso.titulo} onClose={cerrar} variante="tour">
      <div className="tour-cuerpo">
        <span className="tour-icono">
          <i className={paso.icono} aria-hidden="true" />
        </span>
        <p className="tour-texto">{paso.texto}</p>
      </div>

      <div className="tour-puntos" aria-hidden="true">
        {pasos.map((p, i) => (
          <span key={p.titulo} className={"tour-punto" + (i === indice ? " tour-punto--activo" : "")} />
        ))}
      </div>
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
          {indice > 0 && (
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

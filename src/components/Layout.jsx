import { useState } from "react";
import { NAV_CELU, NAV_ITEMS, seccionDelMenu } from "../theme";
import Dialog from "./Dialog";

// Puntito con número sobre una sección que tiene algo pendiente (un gasto
// de los mails sin revisar, un servicio por vencer). No se va solo: queda
// hasta que se resuelve lo que lo prende.
export function Insignia({ aviso }) {
  if (!aviso?.cantidad) return null;
  return (
    <span className="insignia" aria-hidden="true">
      {aviso.cantidad > 9 ? "9+" : aviso.cantidad}
    </span>
  );
}

// Lo que lee un lector de pantalla: "Movimientos, 2 para revisar".
function etiquetaConAviso(label, aviso) {
  return aviso?.cantidad ? `${label}, ${aviso.texto}` : undefined;
}

export function Sidebar({ activeTab, onSelect, avisos = {} }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <i className="ph ph-wallet" aria-hidden="true" />
        Taros Money
      </div>
      <nav className="nav" aria-label="Secciones">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="nav-item"
            aria-current={item.id === seccionDelMenu(activeTab) ? "page" : undefined}
            aria-label={etiquetaConAviso(item.label, avisos[item.id])}
            onClick={() => onSelect(item.id)}
          >
            <span className="con-insignia">
              <i className={item.icon} aria-hidden="true" />
              <Insignia aviso={avisos[item.id]} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav({ activeTab, onSelect, avisos = {} }) {
  const [masAbierto, setMasAbierto] = useState(false);
  const principales = NAV_ITEMS.filter((i) => NAV_CELU.includes(i.id));
  const resto = NAV_ITEMS.filter((i) => !NAV_CELU.includes(i.id));
  const activoEnMas = resto.some((i) => i.id === seccionDelMenu(activeTab));
  // "Más" suma lo pendiente de las secciones que tiene adentro.
  const avisosEnMas = resto.reduce((n, i) => n + (avisos[i.id]?.cantidad || 0), 0);
  const avisoMas = avisosEnMas ? { cantidad: avisosEnMas, texto: `${avisosEnMas} ${avisosEnMas === 1 ? "aviso" : "avisos"}` } : null;

  return (
    <>
      <nav className="bottom-nav" aria-label="Secciones">
        {principales.map((item) => (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item"
            aria-current={item.id === seccionDelMenu(activeTab) ? "page" : undefined}
            aria-label={etiquetaConAviso(item.label, avisos[item.id])}
            onClick={() => onSelect(item.id)}
          >
            <span className="con-insignia">
              <i className={item.icon} aria-hidden="true" />
              <Insignia aviso={avisos[item.id]} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activoEnMas ? "page" : undefined}
          aria-haspopup="dialog"
          aria-label={etiquetaConAviso("Más", avisoMas)}
          onClick={() => setMasAbierto(true)}
        >
          <span className="con-insignia">
            <i className="ph ph-dots-three-outline" aria-hidden="true" />
            <Insignia aviso={avisoMas} />
          </span>
          <span>Más</span>
        </button>
      </nav>

      {masAbierto && (
        <Dialog titulo="Más secciones" onClose={() => setMasAbierto(false)}>
          <div className="menu-mas">
            {resto.map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn btn-secondary"
                aria-current={item.id === seccionDelMenu(activeTab) ? "page" : undefined}
                aria-label={etiquetaConAviso(item.label, avisos[item.id])}
                onClick={() => {
                  onSelect(item.id);
                  setMasAbierto(false);
                }}
              >
                <span className="con-insignia">
                  <i className={item.icon} aria-hidden="true" />
                  <Insignia aviso={avisos[item.id]} />
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}

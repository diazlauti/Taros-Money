import { useState } from "react";
import { NAV_CELU, NAV_ITEMS } from "../theme";
import Dialog from "./Dialog";

export function Sidebar({ activeTab, onSelect }) {
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
            aria-current={item.id === activeTab ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <i className={item.icon} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export function BottomNav({ activeTab, onSelect }) {
  const [masAbierto, setMasAbierto] = useState(false);
  const principales = NAV_ITEMS.filter((i) => NAV_CELU.includes(i.id));
  const resto = NAV_ITEMS.filter((i) => !NAV_CELU.includes(i.id));
  const activoEnMas = resto.some((i) => i.id === activeTab);

  return (
    <>
      <nav className="bottom-nav" aria-label="Secciones">
        {principales.map((item) => (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item"
            aria-current={item.id === activeTab ? "page" : undefined}
            onClick={() => onSelect(item.id)}
          >
            <i className={item.icon} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activoEnMas ? "page" : undefined}
          aria-haspopup="dialog"
          onClick={() => setMasAbierto(true)}
        >
          <i className="ph ph-dots-three-outline" aria-hidden="true" />
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
                aria-current={item.id === activeTab ? "page" : undefined}
                onClick={() => {
                  onSelect(item.id);
                  setMasAbierto(false);
                }}
              >
                <i className={item.icon} aria-hidden="true" />
                {item.label}
              </button>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}

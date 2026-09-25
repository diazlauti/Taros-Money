import { NAV_ITEMS } from "../theme";

export function Sidebar({ activeTab, onSelect, theme, onToggleTheme }) {
return (
    <aside className="sidebar">
    <div className="brand">
    <i className="ph ph-wallet" />
    Taros Money
    </div>
    <nav className="nav">
    {NAV_ITEMS.map((item) => (
    <button
    key={item.id}
    className={"nav-item" + (item.id === activeTab ? " is-active" : "")}
    onClick={() => onSelect(item.id)}
    >
    <i className={item.icon} />
    <span>{item.label}</span>
    </button>
    ))}
    </nav>
    <button className="theme-toggle" onClick={onToggleTheme}>
    <i className={theme === "dark" ? "ph ph-sun" : "ph ph-moon"} />
    {theme === "dark" ? "Modo claro" : "Modo oscuro"}
    </button>
    </aside>
    );
    }

    export function BottomNav({ activeTab, onSelect }) {
    return (
    <nav className="bottom-nav">
    {NAV_ITEMS.map((item) => (
    <button
    key={item.id}
    className={"bottom-nav-item" + (item.id === activeTab ? " is-active" : "")}
    onClick={() => onSelect(item.id)}
    >
    <i className={item.icon} />
    </button>
    ))}
    </nav>
    );
    }
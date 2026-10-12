import { NAV_ITEMS } from "../theme";

export function Sidebar({ activeTab, onSelect }) {
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
import { useCallback, useEffect, useState } from "react";
import {
getSaldo,
getResumen,
getGastos,
getCategorias,
getIngresos,
getCuentas,
getMetas,
getSuscripciones,
getTendencia,
getCotizacion,
haySesion,
cerrarSesion,
cambiarPin,
} from "./api";
import { getTemaInicial, guardarTema, NAV_ITEMS } from "./theme";
import { useSeccion, useIsMobile } from "./hooks";
import { playError, playSuccess, sonidoHabilitado, toggleSonido } from "./sounds";
import { Sidebar, BottomNav } from "./components/Layout";
import ResumenTab from "./components/ResumenTab";
import MovimientosTab from "./components/MovimientosTab";
import CuentasTab from "./components/CuentasTab";
import MetasTab from "./components/MetasTab";
import RecurrentesTab from "./components/RecurrentesTab";
import ReportesTab from "./components/ReportesTab";
import NuevoMovimientoDialog from "./components/NuevoMovimientoDialog";
import Login from "./components/Login";

export default function App() {
const [autenticado, setAutenticado] = useState(haySesion);

useEffect(() => {
function onSesionVencida() {
setAutenticado(false);
}
window.addEventListener("taros:sesion-vencida", onSesionVencida);
return () => window.removeEventListener("taros:sesion-vencida", onSesionVencida);
}, []);

if (!autenticado) {
return <Login onSuccess={() => setAutenticado(true)} />;
}

return <PanelPrincipal onCerrarSesion={() => { cerrarSesion(); setAutenticado(false); }} />;
}

function PanelPrincipal({ onCerrarSesion }) {
const [theme, setTheme] = useState(getTemaInicial);
const [sonido, setSonido] = useState(sonidoHabilitado);
const [activeTab, setActiveTab] = useState("resumen");
const [dias, setDias] = useState(30);
const [dialogOpen, setDialogOpen] = useState(false);
const isMobile = useIsMobile();

const saldo = useSeccion(getSaldo, []);
const resumen = useSeccion(() => getResumen(dias), [dias]);
const gastos = useSeccion(() => getGastos(dias), [dias]);
const ingresos = useSeccion(() => getIngresos(dias), [dias]);
const categorias = useSeccion(getCategorias, []);
const cuentas = useSeccion(getCuentas, []);
const metas = useSeccion(getMetas, []);
const suscripciones = useSeccion(getSuscripciones, []);
const tendencia = useSeccion(() => getTendencia(6), []);
const cotizacion = useSeccion(getCotizacion, []);

const recargarTodo = useCallback(() => {
saldo.recargar();
resumen.recargar();
gastos.recargar();
ingresos.recargar();
cuentas.recargar();
metas.recargar();
suscripciones.recargar();
tendencia.recargar();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [saldo, resumen, gastos, ingresos, cuentas, metas, suscripciones, tendencia]);

function toggleTheme() {
const next = theme === "dark" ? "light" : "dark";
guardarTema(next);
setTheme(next);
}

function alternarSonido() {
setSonido(toggleSonido());
}

async function manejarCambiarPin() {
const nuevo = window.prompt("PIN nuevo (al menos 4 caracteres):");
if (!nuevo) return;
try {
await cambiarPin(nuevo);
playSuccess();
window.alert("Listo, PIN cambiado.");
} catch (err) {
playError();
window.alert(err.message || "No se pudo cambiar el PIN.");
}
}

const activeItem = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

return (
<div className="app-shell" data-theme={theme}>
{!isMobile && (
<Sidebar
activeTab={activeTab}
onSelect={setActiveTab}
theme={theme}
onToggleTheme={toggleTheme}
sonido={sonido}
onToggleSonido={alternarSonido}
onCambiarPin={manejarCambiarPin}
onCerrarSesion={onCerrarSesion}
/>
)}

<main className="main">
<header className="main-header">
<h1>{activeItem.label}</h1>
{isMobile && (
<button className="btn btn-icon btn-secondary" onClick={toggleTheme}>
<i className={theme === "dark" ? "ph ph-sun" : "ph ph-moon"} />
</button>
)}
{isMobile && (
<button className="btn btn-icon btn-secondary" onClick={alternarSonido} title="Sonido">
<i className={sonido ? "ph ph-speaker-high" : "ph ph-speaker-slash"} />
</button>
)}
{isMobile && (
<button className="btn btn-icon btn-secondary" onClick={onCerrarSesion} title="Cerrar sesión">
<i className="ph ph-sign-out" />
</button>
)}
<button className="btn btn-primary" onClick={() => setDialogOpen(true)}>
<i className="ph ph-plus" />
Nuevo movimiento
</button>
</header>

<div className={"main-content" + (isMobile ? " main-content--con-bottom-nav" : "")}>
<div className="tab-pane" key={activeTab}>
{activeTab === "resumen" && (
<ResumenTab
saldo={saldo.data}
cargandoSaldo={saldo.cargando}
resumen={resumen.data}
cargandoResumen={resumen.cargando}
gastos={gastos.data}
cargandoGastos={gastos.cargando}
dias={dias}
onCambiarDias={setDias}
cuentas={cuentas.data}
cotizacionUsdArs={cotizacion.data}
/>
)}

{activeTab === "movimientos" && (
<MovimientosTab
gastos={gastos.data}
ingresos={ingresos.data}
cargando={gastos.cargando}
categorias={categorias.data}
onCambio={recargarTodo}
/>
)}

{activeTab === "cuentas" && (
<CuentasTab
cuentas={cuentas.data}
cargando={cuentas.cargando}
error={cuentas.error}
onCambio={cuentas.recargar}
/>
)}

{activeTab === "metas" && (
<MetasTab metas={metas.data} cargando={metas.cargando} error={metas.error} onCambio={metas.recargar} />
)}

{activeTab === "recurrentes" && (
<RecurrentesTab
suscripciones={suscripciones.data}
cargando={suscripciones.cargando}
error={suscripciones.error}
/>
)}

{activeTab === "reportes" && (
<ReportesTab tendencia={tendencia.data} cargando={tendencia.cargando} error={tendencia.error} />
)}
</div>
</div>
</main>

{isMobile && <BottomNav activeTab={activeTab} onSelect={setActiveTab} />}

{dialogOpen && (
<NuevoMovimientoDialog
categorias={categorias.data}
cuentas={cuentas.data}
onClose={() => setDialogOpen(false)}
onGuardado={recargarTodo}
/>
)}
</div>
);
}

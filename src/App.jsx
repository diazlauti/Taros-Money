import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
getSaldo,
getResumen,
getGastos,
getCategorias,
agregarCategoria,
borrarCategoria,
getIngresos,
getCuentas,
getMetas,
getSuscripciones,
getTendencia,
getCotizacion,
getUrlPlanilla,
getConfigMails,
guardarModoMails,
activarMails,
revisarMails,
mailsDisponible,
idDePlanilla,
} from "./api";
import { haySesion, cerrarSesion, intentarSesionSilenciosa } from "./auth";
import { aplicarTema, getTemaInicial, guardarTema, NAV_ITEMS } from "./theme";
import { mapaMonedas } from "./format";
import { useSeccion } from "./hooks";
import { useAvisos } from "./avisos";
import { sonidoHabilitado, toggleSonido } from "./sounds";
import { Sidebar, BottomNav } from "./components/Layout";
import AvisosProvider from "./components/Avisos";
import ResumenTab from "./components/ResumenTab";
import MovimientosTab from "./components/MovimientosTab";
import CuentasTab from "./components/CuentasTab";
import MetasTab from "./components/MetasTab";
import RecurrentesTab from "./components/RecurrentesTab";
import ReportesTab from "./components/ReportesTab";
import ConfiguracionTab from "./components/ConfiguracionTab";
import NuevoMovimientoDialog from "./components/NuevoMovimientoDialog";
import Login from "./components/Login";
import Tour from "./components/Tour";
import { tourVisto } from "./tour";
import InstalarAppDialog from "./components/InstalarAppDialog";

export default function App() {
const [autenticado, setAutenticado] = useState(haySesion);
// Si ya había dado permiso antes (otra visita, PWA reabierta), intenta
// renovar el token solo, sin mostrar nada — evita pedir el login de nuevo
// cada vez que el token de una hora vence. Sólo corre si todavía no hay
// una sesión guardada válida.
const [verificando, setVerificando] = useState(!haySesion());
// El tema vive acá (y no en el panel) para que el login también lo use.
const [tema, setTema] = useState(getTemaInicial);

useEffect(() => {
aplicarTema(tema);
}, [tema]);

useEffect(() => {
function onSesionVencida() {
setAutenticado(false);
}
window.addEventListener("taros:sesion-vencida", onSesionVencida);
return () => window.removeEventListener("taros:sesion-vencida", onSesionVencida);
}, []);

useEffect(() => {
if (autenticado) return;
intentarSesionSilenciosa().then((datos) => {
if (datos) setAutenticado(true);
setVerificando(false);
});
}, [autenticado]);

function cambiarTema(nuevo) {
guardarTema(nuevo);
setTema(nuevo);
}

if (verificando) {
return (
<main className="pantalla-login">
<div className="login-hero" role="status" aria-live="polite">
<img className="login-logo login-logo--pulso" src="/icon-192.png" alt="" width="192" height="192" />
<p className="login-titulo">Taros Money</p>
<p className="mensaje-estado">Abriendo tu sesión…</p>
</div>
</main>
);
}

if (!autenticado) {
return <Login onSuccess={() => setAutenticado(true)} />;
}

return (
<AvisosProvider>
<PanelPrincipal
tema={tema}
onCambiarTema={cambiarTema}
onCerrarSesion={() => {
cerrarSesion();
setAutenticado(false);
}}
/>
</AvisosProvider>
);
}

function PanelPrincipal({ tema, onCambiarTema, onCerrarSesion }) {
const [sonido, setSonido] = useState(sonidoHabilitado);
const [activeTab, setActiveTab] = useState("resumen");
const [dias, setDias] = useState(30);
const [dialogOpen, setDialogOpen] = useState(false);
// El recorrido aparece solo la primera vez; después se abre desde Configuración.
const [tourAbierto, setTourAbierto] = useState(() => !tourVisto());
const [guiaInstalarAbierta, setGuiaInstalarAbierta] = useState(false);

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
const urlPlanilla = useSeccion(getUrlPlanilla, []);
const configMails = useSeccion(() => (mailsDisponible() ? getConfigMails() : Promise.resolve(null)), []);

// Si una recarga falla pero ya había datos en pantalla, se siguen mostrando
// los anteriores y se avisa (antes no se enteraba nadie).
const { avisar } = useAvisos();
const erroresConDatos = [saldo, resumen, gastos, ingresos, cuentas, metas, suscripciones, tendencia]
.filter((s) => s.error && s.data !== null)
.map((s) => s.error);
const primerError = erroresConDatos[0] || "";
useEffect(() => {
if (primerError) avisar(`No se pudo actualizar: ${primerError}`, "error");
}, [primerError, avisar]);

// Única fuente de verdad para "en qué moneda está cada cuenta".
const monedaPorCuenta = useMemo(() => mapaMonedas(cuentas.data), [cuentas.data]);

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

// --- Gastos desde tus mails ---
const [revisandoMails, setRevisandoMails] = useState(false);
const modoMails = configMails.data?.modo || "apagado";
const planillaId = idDePlanilla(urlPlanilla.data);

// interactivo=true solo desde un click: si hace falta, abre la ventana de
// permisos de Google. Devuelve el resultado o tira el error.
const revisarMisMails = useCallback(
async ({ interactivo = false, dias } = {}) => {
if (!planillaId) throw new Error("Todavía no se encontró tu planilla. Probá de nuevo en un momento.");
setRevisandoMails(true);
try {
const resultado = await revisarMails(planillaId, dias, { interactivo });
if (resultado?.nuevos > 0) {
gastos.recargar();
resumen.recargar();
cuentas.recargar();
tendencia.recargar();
}
return resultado;
} finally {
setRevisandoMails(false);
}
},
// eslint-disable-next-line react-hooks/exhaustive-deps
[planillaId, gastos, resumen, cuentas, tendencia]
);

const avisarResultadoMails = useCallback(
(resultado) => {
const n = resultado?.nuevos || 0;
avisar(
n === 0
? "No hay gastos nuevos en tus mails."
: n === 1
? "Encontré 1 gasto nuevo en tus mails. Revisalo en Movimientos."
: `Encontré ${n} gastos nuevos en tus mails. Revisalos en Movimientos.`
);
},
[avisar]
);

async function revisarMailsConBoton() {
try {
avisarResultadoMails(await revisarMisMails({ interactivo: true }));
} catch (err) {
avisar(err.message || "No se pudieron revisar tus mails. Probá de nuevo.", "error");
}
}

// Modo "al abrir": una sola vez por apertura de la app, sin ventanas. Si
// el permiso de Gmail venció, avisa y se puede revisar con el botón.
const yaRevisoAlAbrir = useRef(false);
useEffect(() => {
if (modoMails !== "al_abrir" || !planillaId || yaRevisoAlAbrir.current) return;
yaRevisoAlAbrir.current = true;
revisarMisMails()
.then((resultado) => {
if (resultado?.nuevos > 0) avisarResultadoMails(resultado);
})
.catch((err) => avisar(`No se pudieron revisar tus mails: ${err.message}`, "error"));
}, [modoMails, planillaId, revisarMisMails, avisar, avisarResultadoMails]);

// Cambiar el modo desde Configuración. Se llama directo desde el click: la
// primera vez, activarMails abre la ventana de permisos de Google.
async function cambiarModoMails(modo) {
if (modo !== "apagado" && !planillaId) {
throw new Error("Todavía no se encontró tu planilla. Probá de nuevo en un momento.");
}
const anterior = modoMails;
yaRevisoAlAbrir.current = true;
// Para apagar no hace falta pedir permisos: si el automático estaba
// prendido se intenta frenar, pero si no se puede igual se apaga acá.
if (modo === "apagado") {
if (anterior === "siempre") await activarMails(planillaId, "apagado").catch(() => {});
} else {
await activarMails(planillaId, modo, { interactivo: true });
}
await guardarModoMails(modo);
configMails.recargar();
if (anterior === "apagado" && modo !== "apagado") {
// Primera vez: mira dos semanas para atrás, así ya ves algo.
avisarResultadoMails(await revisarMisMails({ interactivo: true, dias: 14 }));
}
}

function alternarSonido() {
setSonido(toggleSonido());
}

async function agregarCategoriaYRecargar(nombre) {
await agregarCategoria(nombre);
categorias.recargar();
}

async function borrarCategoriaYRecargar(nombre) {
await borrarCategoria(nombre);
categorias.recargar();
}

const abrirNuevo = () => setDialogOpen(true);
const activeItem = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

return (
<div className="app-shell">
<Sidebar activeTab={activeTab} onSelect={setActiveTab} />

<main className="main">
<header className="main-header">
<i className="ph ph-wallet brand-icono" role="img" aria-label="Taros Money" />
<h1>{activeItem.label}</h1>
<button type="button" className="btn btn-primary" onClick={abrirNuevo}>
<i className="ph ph-plus" aria-hidden="true" />
Nuevo movimiento
</button>
</header>

<div className="main-content">
<div className="tab-pane" key={activeTab}>
{activeTab === "resumen" && (
<ResumenTab
saldo={saldo}
resumen={resumen}
gastos={gastos}
cuentas={cuentas}
cotizacionUsdArs={cotizacion.data}
monedaPorCuenta={monedaPorCuenta}
dias={dias}
onCambiarDias={setDias}
onNuevo={abrirNuevo}
onIrA={setActiveTab}
/>
)}

{activeTab === "movimientos" && (
<MovimientosTab
gastos={gastos}
ingresos={ingresos}
categorias={categorias.data}
cuentas={cuentas.data}
monedaPorCuenta={monedaPorCuenta}
dias={dias}
onCambiarDias={setDias}
onNuevo={abrirNuevo}
onCambio={recargarTodo}
mailsActivos={modoMails !== "apagado"}
revisandoMails={revisandoMails}
onRevisarMails={revisarMailsConBoton}
/>
)}

{activeTab === "cuentas" && <CuentasTab cuentas={cuentas} onCambio={cuentas.recargar} onIrA={setActiveTab} />}

{activeTab === "metas" && <MetasTab metas={metas} onCambio={metas.recargar} onIrA={setActiveTab} />}

{activeTab === "recurrentes" && (
<RecurrentesTab
suscripciones={suscripciones}
categorias={categorias.data}
cuentas={cuentas.data}
cotizacionUsdArs={cotizacion.data}
monedaPorCuenta={monedaPorCuenta}
onCambio={suscripciones.recargar}
/>
)}

{activeTab === "reportes" && <ReportesTab tendencia={tendencia} onNuevo={abrirNuevo} />}

{activeTab === "configuracion" && (
<ConfiguracionTab
urlPlanilla={urlPlanilla}
configMails={mailsDisponible() ? configMails : null}
onCambiarModoMails={cambiarModoMails}
revisandoMails={revisandoMails}
onRevisarMails={revisarMailsConBoton}
categorias={categorias}
onAgregarCategoria={agregarCategoriaYRecargar}
onBorrarCategoria={borrarCategoriaYRecargar}
tema={tema}
onCambiarTema={onCambiarTema}
sonido={sonido}
onToggleSonido={alternarSonido}
onCerrarSesion={onCerrarSesion}
onVerTour={() => setTourAbierto(true)}
onInstalar={() => setGuiaInstalarAbierta(true)}
/>
)}
</div>
</div>
</main>

<BottomNav activeTab={activeTab} onSelect={setActiveTab} />

{dialogOpen && (
<NuevoMovimientoDialog
categorias={categorias.data}
cuentas={cuentas.data}
onClose={() => setDialogOpen(false)}
onGuardado={recargarTodo}
/>
)}

{tourAbierto && (
<Tour
onIrA={setActiveTab}
onClose={() => setTourAbierto(false)}
onInstalar={() => {
setTourAbierto(false);
setGuiaInstalarAbierta(true);
}}
/>
)}

{guiaInstalarAbierta && <InstalarAppDialog onClose={() => setGuiaInstalarAbierta(false)} />}
</div>
);
}

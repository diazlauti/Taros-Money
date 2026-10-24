import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
getSaldo,
getResumen,
getGastos,
getCategorias,
getIconosCategorias,
guardarIconoCategoria,
agregarCategoria,
borrarCategoria,
getIngresos,
getCuentas,
getMetas,
getSuscripciones,
getServicios,
getTendencia,
getMonedas,
guardarCotizacionesAuto,
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
import { fmtMoney, mapaMonedas } from "./format";
import { cotizacionesParaGuardar, registrarMonedasPropias, resolverCotizaciones, traerCotizaciones } from "./monedas";
import { registrarIconos } from "./iconos";
import { notificar } from "./notificaciones";
import { avisarServiciosUrgentes } from "./recordatorios";
import { serviciosConEstado } from "./servicios";
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
import ServiciosTab from "./components/ServiciosTab";
import ReportesTab from "./components/ReportesTab";
import ConfiguracionTab from "./components/ConfiguracionTab";
import NuevoMovimientoDialog from "./components/NuevoMovimientoDialog";
import Login from "./components/Login";
import Tour from "./components/Tour";
import { tourVisto } from "./tour";
import { leerNuevoDeUrl, limpiarNuevoDeUrl } from "./cargaRapida";
import InstalarAppDialog from "./components/InstalarAppDialog";
import CalculadoraDialog from "./components/CalculadoraDialog";

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
// Si se entró por un atajo del ícono o un link (?nuevo=gasto&monto=…), se
// abre directo el formulario completo y el recorrido queda para otra vez.
const [inicialNuevo, setInicialNuevo] = useState(leerNuevoDeUrl);
const [dialogOpen, setDialogOpen] = useState(() => inicialNuevo !== null);
// El recorrido aparece solo la primera vez; después se abre desde Configuración.
const [tourAbierto, setTourAbierto] = useState(() => !tourVisto() && inicialNuevo === null);
const [guiaInstalarAbierta, setGuiaInstalarAbierta] = useState(false);
const [calculadoraAbierta, setCalculadoraAbierta] = useState(false);

useEffect(() => {
if (inicialNuevo) limpiarNuevoDeUrl();
}, [inicialNuevo]);

const saldo = useSeccion(getSaldo, []);
const resumen = useSeccion(() => getResumen(dias), [dias]);
const gastos = useSeccion(() => getGastos(dias), [dias]);
const ingresos = useSeccion(() => getIngresos(dias), [dias]);
const categorias = useSeccion(getCategorias, []);
const iconosCategorias = useSeccion(getIconosCategorias, []);
const cuentas = useSeccion(getCuentas, []);
const metas = useSeccion(getMetas, []);
const suscripciones = useSeccion(getSuscripciones, []);
const servicios = useSeccion(getServicios, []);
const tendencia = useSeccion(() => getTendencia(6), []);
const monedas = useSeccion(getMonedas, []);
const cotizacionesHoy = useSeccion(traerCotizaciones, []);
const urlPlanilla = useSeccion(getUrlPlanilla, []);
const configMails = useSeccion(() => (mailsDisponible() ? getConfigMails() : Promise.resolve(null)), []);

// Si una recarga falla pero ya había datos en pantalla, se siguen mostrando
// los anteriores y se avisa (antes no se enteraba nadie).
const { avisar } = useAvisos();
const erroresConDatos = [saldo, resumen, gastos, ingresos, cuentas, metas, suscripciones, servicios, tendencia]
.filter((s) => s.error && s.data !== null)
.map((s) => s.error);
const primerError = erroresConDatos[0] || "";
useEffect(() => {
if (primerError) avisar(`No se pudo actualizar: ${primerError}`, "error");
}, [primerError, avisar]);

// Al abrir la app, si dio permiso, avisa con una notificación los servicios
// vencidos o que vencen pronto (una vez por día).
useEffect(() => {
if (servicios.data) avisarServiciosUrgentes(serviciosConEstado(servicios.data));
}, [servicios.data]);

// Única fuente de verdad para "en qué moneda está cada cuenta".
const monedaPorCuenta = useMemo(() => mapaMonedas(cuentas.data), [cuentas.data]);

// Con cuánto se pasa cada moneda a pesos: la automática de hoy si llegó, si
// no la fija o la última guardada.
const configMonedas = monedas.data?.monedas;
// Monedas propias e íconos elegidos: se registran antes de dibujar, así
// cualquier monto o categoría de la app los usa.
registrarMonedasPropias(configMonedas);
registrarIconos(iconosCategorias.data?.iconos);
const cotizaciones = useMemo(
() => resolverCotizaciones(configMonedas, cotizacionesHoy.data),
[configMonedas, cotizacionesHoy.data],
);

// Si la cotización automática de hoy es distinta de la guardada, se la pasa
// al backend para que el resumen por categoría y la tendencia usen la misma.
const ultimaGuardada = useRef("");
useEffect(() => {
if (!configMonedas || monedas.data?.sinConfigurar || !cotizacionesHoy.data) return;
const cambios = cotizacionesParaGuardar(configMonedas, cotizacionesHoy.data);
const clave = JSON.stringify(cambios);
if (clave === "{}" || clave === ultimaGuardada.current) return;
ultimaGuardada.current = clave;
guardarCotizacionesAuto(cambios)
.then(() => {
monedas.recargar();
resumen.recargar();
tendencia.recargar();
})
.catch(() => {
/* sin drama: se reintenta la próxima vez que se abra la app */
});
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [configMonedas, cotizacionesHoy.data]);

const recargarTodo = useCallback(() => {
saldo.recargar();
resumen.recargar();
gastos.recargar();
ingresos.recargar();
cuentas.recargar();
metas.recargar();
suscripciones.recargar();
servicios.recargar();
tendencia.recargar();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [saldo, resumen, gastos, ingresos, cuentas, metas, suscripciones, servicios, tendencia]);

// --- Gastos desde tus mails ---
const [revisandoMails, setRevisandoMails] = useState(false);
// Desde la tarjeta del Resumen se puede abrir Movimientos ya filtrado.
const [filtroMovimientos, setFiltroMovimientos] = useState("todos");
const modoMails = configMails.data?.modo || "apagado";
const planillaId = idDePlanilla(urlPlanilla.data);

const cantidadARevisar = [...(gastos.data || []), ...(ingresos.data || [])].filter((g) => g.aRevisar).length;

// interactivo=true solo desde un click: si hace falta, abre la ventana de
// permisos de Google. Devuelve el resultado o tira el error.
const revisarMisMails = useCallback(
async ({ interactivo = false, dias } = {}) => {
if (!planillaId) throw new Error("Todavía no se encontró tu planilla. Probá de nuevo en un momento.");
setRevisandoMails(true);
try {
const resultado = await revisarMails(planillaId, dias, { interactivo });
// Lo que encontró esta revisión ya se avisa acá: que no vuelva a salir
// como "mientras no estabas".
marcarVistos((resultado?.encontrados || []).map(claveGasto));
configMails.recargar();
if (resultado?.nuevos > 0) {
gastos.recargar();
ingresos.recargar();
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
[planillaId, gastos, ingresos, resumen, cuentas, tendencia, configMails]
);

// Aviso dentro de la app + notificación del sistema (si se dio permiso).
// Con siempreAvisar=false no dice nada cuando no encontró nada (al abrir).
const avisarResultadoMails = useCallback(
(resultado, { siempreAvisar = true } = {}) => {
const encontrados = resultado?.encontrados || [];
const n = resultado?.nuevos || encontrados.length;
if (n === 0) {
if (!siempreAvisar) return;
avisar("No encontré movimientos nuevos en tus mails.");
notificar("Taros Money", "Revisé tus mails: no hay nada nuevo.");
return;
}
const detalle = encontrados
.slice(0, 3)
.map((g) => `${g.descripcion || "Sin descripción"} ${g.tipo === "ingreso" ? "+" : ""}${fmtMoney(g.monto)}`)
.join(", ");
const resto = encontrados.length > 3 ? ` y ${encontrados.length - 3} más` : "";
const titulo = n === 1 ? "Encontré 1 movimiento en tus mails" : `Encontré ${n} movimientos en tus mails`;
avisar(`${titulo}: ${detalle}${resto}. Revisalos en Movimientos.`);
notificar(titulo, `${detalle}${resto}. Tocá para revisarlos.`);
},
[avisar]
);

// Modo "siempre": lo que se cargó solo con la app cerrada se avisa al
// volver a abrirla. Se recuerda qué gastos "A revisar" ya se avisaron.
useEffect(() => {
if (modoMails !== "siempre" || !gastos.data) return;
const claves = gastos.data.filter((g) => g.aRevisar).map(claveGasto);
const { vistos, primeraVez } = leerVistos();
const nuevos = claves.filter((c) => !vistos.has(c));
marcarVistos(claves, { aunqueSeaVacio: primeraVez });
if (primeraVez || nuevos.length === 0) return;
const titulo = nuevos.length === 1 ? "Mientras no estabas encontré 1 gasto" : `Mientras no estabas encontré ${nuevos.length} gastos`;
avisar(`${titulo} en tus mails. Revisalos en Movimientos.`);
notificar(titulo, "Están en Movimientos con la etiqueta \"A revisar\".");
}, [modoMails, gastos.data, avisar]);

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
avisarResultadoMails(resultado, { siempreAvisar: false });
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

async function guardarIconoYRecargar(nombre, icono) {
await guardarIconoCategoria(nombre, icono);
iconosCategorias.recargar();
}

// Puntitos en el menú: lo que quedó pendiente se sigue marcando hasta que
// se resuelve (un gasto de los mails sin revisar, un servicio por vencer).
const serviciosUrgentes = useMemo(
() => serviciosConEstado(servicios.data).filter((s) => s.estado === "vencido" || s.estado === "pronto").length,
[servicios.data],
);
const avisosMenu = {
movimientos: cantidadARevisar
? { cantidad: cantidadARevisar, texto: `${cantidadARevisar} ${cantidadARevisar === 1 ? "movimiento" : "movimientos"} para revisar` }
: null,
servicios: serviciosUrgentes
? { cantidad: serviciosUrgentes, texto: `${serviciosUrgentes} ${serviciosUrgentes === 1 ? "servicio vencido o por vencer" : "servicios vencidos o por vencer"}` }
: null,
};
const totalAvisos = cantidadARevisar + serviciosUrgentes;

// Con la app instalada, el mismo número aparece sobre el ícono (donde el
// sistema lo permite).
useEffect(() => {
try {
if (totalAvisos > 0) navigator.setAppBadge?.(totalAvisos)?.catch?.(() => {});
else navigator.clearAppBadge?.()?.catch?.(() => {});
} catch {
/* el navegador no lo soporta: no pasa nada */
}
}, [totalAvisos]);

const abrirNuevo = () => {
setInicialNuevo(null);
setDialogOpen(true);
};
// Navegar desde el menú abre Movimientos sin filtro.
function irA(tab) {
setFiltroMovimientos("todos");
setActiveTab(tab);
}
const activeItem = NAV_ITEMS.find((i) => i.id === activeTab) || NAV_ITEMS[0];

return (
<div className="app-shell">
<Sidebar activeTab={activeTab} onSelect={irA} avisos={avisosMenu} />

<main className="main">
<header className="main-header">
<i className="ph ph-wallet brand-icono" role="img" aria-label="Taros Money" />
<h1>{activeItem.label}</h1>
<button
type="button"
className="btn btn-secondary btn-calculadora"
onClick={() => setCalculadoraAbierta(true)}
aria-haspopup="dialog"
title="Calculadora de impuestos"
>
<i className="ph ph-calculator" aria-hidden="true" />
<span className="visualmente-oculto">Calculadora de impuestos</span>
</button>
<button type="button" className="btn btn-primary" onClick={abrirNuevo} data-tour="nuevo-movimiento">
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
servicios={servicios}
cotizaciones={cotizaciones}
monedaPorCuenta={monedaPorCuenta}
dias={dias}
onCambiarDias={setDias}
onNuevo={abrirNuevo}
onIrA={setActiveTab}
mails={
mailsDisponible()
? {
config: configMails,
cantidadARevisar,
revisando: revisandoMails,
onRevisar: revisarMailsConBoton,
onVerARevisar: () => {
setFiltroMovimientos("revisar");
setActiveTab("movimientos");
},
onActivar: () => setActiveTab("configuracion"),
}
: null
}
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
filtroInicial={filtroMovimientos}
revisandoMails={revisandoMails}
onRevisarMails={revisarMailsConBoton}
/>
)}

{activeTab === "cuentas" && (
<CuentasTab
cuentas={cuentas}
monedasActivas={Object.keys(configMonedas || {})}
onCambio={cuentas.recargar}
onCambioGeneral={recargarTodo}
onIrAMonedas={() => setActiveTab("configuracion")}
/>
)}

{activeTab === "metas" && <MetasTab metas={metas} onCambio={metas.recargar} />}

{activeTab === "servicios" && (
<ServiciosTab
servicios={servicios}
categorias={categorias.data}
cuentas={cuentas.data}
cotizaciones={cotizaciones}
monedaPorCuenta={monedaPorCuenta}
onCambio={servicios.recargar}
onCambioConGasto={recargarTodo}
/>
)}

{activeTab === "recurrentes" && (
<RecurrentesTab
suscripciones={suscripciones}
categorias={categorias.data}
cuentas={cuentas.data}
cotizaciones={cotizaciones}
monedaPorCuenta={monedaPorCuenta}
onCambio={suscripciones.recargar}
/>
)}

{activeTab === "reportes" && <ReportesTab tendencia={tendencia} onNuevo={abrirNuevo} />}

{activeTab === "configuracion" && (
<ConfiguracionTab
urlPlanilla={urlPlanilla}
monedas={monedas}
cotizacionesHoy={cotizacionesHoy}
cuentas={cuentas.data}
onMonedasGuardadas={() => {
monedas.recargar();
recargarTodo();
}}
configMails={mailsDisponible() ? configMails : null}
onCambiarModoMails={cambiarModoMails}
revisandoMails={revisandoMails}
onRevisarMails={revisarMailsConBoton}
categorias={categorias}
onAgregarCategoria={agregarCategoriaYRecargar}
onBorrarCategoria={borrarCategoriaYRecargar}
onGuardarIconoCategoria={guardarIconoYRecargar}
iconosSoloEsteDispositivo={!!iconosCategorias.data?.soloEsteDispositivo}
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

<BottomNav activeTab={activeTab} onSelect={irA} avisos={avisosMenu} />

{dialogOpen && (
<NuevoMovimientoDialog
categorias={categorias.data}
cuentas={cuentas.data}
gastos={gastos.data}
ingresos={ingresos.data}
inicial={inicialNuevo}
monedaPorCuenta={monedaPorCuenta}
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

{calculadoraAbierta && (
<CalculadoraDialog
cotizaciones={cotizaciones}
configMonedas={configMonedas}
cotizacionesHoy={cotizacionesHoy}
onClose={() => setCalculadoraAbierta(false)}
onCargarGasto={(datos) => {
setCalculadoraAbierta(false);
setInicialNuevo(datos);
setDialogOpen(true);
}}
/>
)}
</div>
);
}

// --- Qué gastos detectados ya se avisaron (por dispositivo) ---
const VISTOS_KEY = "taros-mails-vistos";

function claveGasto(g) {
return `${g.fecha}|${g.hora}|${Number(g.monto).toFixed(2)}`;
}

function leerVistos() {
try {
const crudo = localStorage.getItem(VISTOS_KEY);
return { vistos: new Set(crudo ? JSON.parse(crudo) : []), primeraVez: crudo === null };
} catch {
return { vistos: new Set(), primeraVez: true };
}
}

function marcarVistos(claves, { aunqueSeaVacio = false } = {}) {
if (claves.length === 0 && !aunqueSeaVacio) return;
try {
const { vistos } = leerVistos();
claves.forEach((c) => vistos.add(c));
// Solo los últimos 200: alcanza para no repetir avisos.
localStorage.setItem(VISTOS_KEY, JSON.stringify([...vistos].slice(-200)));
} catch {
/* sin storage: a lo sumo se repite algún aviso */
}
}

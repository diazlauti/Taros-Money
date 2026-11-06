import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { haySesion, cerrarSesion, intentarSesionSilenciosa, sesionRecordada } from "./auth";
import { bloqueoActivo, MINUTOS_AFUERA } from "./bloqueo";
import { aplicarTema, getTemaInicial, guardarTema } from "./theme";
import { asegurarDueno, borrarDatosGuardados, hayCopias } from "./sinConexion";
import AvisosProvider from "./components/Avisos";
import AvisoActualizacion from "./components/AvisoActualizacion";
import ConfirmarProvider from "./components/Confirmar";
import Login from "./components/Login";
import PantallaBloqueo from "./components/PantallaBloqueo";
// El panel (todas las secciones) se baja aparte: la página de inicio y el
// login cargan solos y se ven más rápido.
// Con la sesión abierta se empieza a bajar enseguida, sin esperar al login.
const cargarPanel = () => import("./Panel");
if (haySesion() || sesionRecordada()) cargarPanel();
const PanelPrincipal = lazy(cargarPanel);

function Abriendo() {
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

export default function App() {
const [autenticado, setAutenticado] = useState(haySesion);
// Si ya había entrado antes (otra visita, PWA reabierta), renueva el token
// solo con la sesión larga, sin mostrar nada — evita pedir el login de nuevo
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

// Bloqueo con huella o Face ID (si está prendido en este dispositivo): pide
// la huella al abrir y al volver después de un rato afuera. Recién después
// de la primera vez se arma el panel, así no se carga ningún número antes.
const [bloqueada, setBloqueada] = useState(bloqueoActivo);
const [panelListo, setPanelListo] = useState(() => !bloqueoActivo());
// «Entrar con Google» desde el bloqueo: que no vuelva a entrar solo con la
// sesión larga mientras se termina de cerrar.
const sinSilenciosa = useRef(false);

useEffect(() => {
let ocultaDesde = null;
function alCambiar() {
if (document.visibilityState === "hidden") {
ocultaDesde = Date.now();
} else if (ocultaDesde && bloqueoActivo() && Date.now() - ocultaDesde >= MINUTOS_AFUERA * 60000) {
setBloqueada(true);
}
}
document.addEventListener("visibilitychange", alCambiar);
return () => document.removeEventListener("visibilitychange", alCambiar);
}, []);

useEffect(() => {
if (autenticado) return;
if (sinSilenciosa.current) {
sinSilenciosa.current = false;
setVerificando(false);
return;
}
intentarSesionSilenciosa().then((datos) => {
if (datos?.token) {
asegurarDueno(sesionRecordada()?.email);
setAutenticado(true);
} else if (datos?.sinRed && sesionRecordada() && hayCopias()) {
// Sin internet y con la sesión vencida: entra igual con lo último
// guardado. Al volver la conexión se renueva sola.
setAutenticado(true);
}
setVerificando(false);
});
}, [autenticado]);

function cambiarTema(nuevo) {
guardarTema(nuevo);
setTema(nuevo);
}

if (verificando) return <Abriendo />;

if (!autenticado) {
return (
<ConfirmarProvider>
<Login
onSuccess={() => {
// Si entró otra cuenta, que no vea lo guardado de la anterior.
asegurarDueno(sesionRecordada()?.email);
// Recién se verificó con Google: no hace falta además la huella.
setBloqueada(false);
setPanelListo(true);
setAutenticado(true);
}}
recordada={sesionRecordada()}
/>
</ConfirmarProvider>
);
}

const pantallaBloqueo = bloqueada && (
<PantallaBloqueo
onDesbloqueada={() => {
setBloqueada(false);
setPanelListo(true);
}}
onEntrarConGoogle={() => {
sinSilenciosa.current = true;
cerrarSesion();
setAutenticado(false);
}}
/>
);

if (!panelListo) return pantallaBloqueo;

return (
<AvisosProvider>
{/* Bloqueada al volver: el panel queda armado (no se pierde lo que estabas
haciendo) pero tapado e inaccesible. */}
<div className="app-raiz" inert={bloqueada} aria-hidden={bloqueada || undefined}>
<ConfirmarProvider>
<Suspense fallback={<Abriendo />}>
<PanelPrincipal
tema={tema}
onCambiarTema={cambiarTema}
onCerrarSesion={() => {
cerrarSesion();
// Lo guardado en el dispositivo (copias y fila de espera) es de esta
// sesión: al salir no queda nada.
borrarDatosGuardados();
setAutenticado(false);
}}
/>
</Suspense>
</ConfirmarProvider>
{/* Solo adentro de la app: en la landing y el login no se ofrece. */}
<AvisoActualizacion />
</div>
{pantallaBloqueo}
</AvisosProvider>
);
}

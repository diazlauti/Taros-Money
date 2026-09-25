import { useCallback, useEffect, useState } from "react";

// Carga una sección de datos de forma independiente: si el endpoint todavía
// no existe en el Apps Script (secciones nuevas: cuentas, metas, etc.) esa
// sección muestra su propio mensaje en vez de romper el resto de la app.
export function useSeccion(fetcher, deps = []) {
const [estado, setEstado] = useState({ data: null, cargando: true, error: "" });

const cargar = useCallback(() => {
let cancelado = false;
setEstado((e) => ({ ...e, cargando: true, error: "" }));
fetcher()
.then((data) => {
if (!cancelado) setEstado({ data, cargando: false, error: "" });
})
.catch((err) => {
if (!cancelado) setEstado({ data: null, cargando: false, error: err.message || "Error" });
});
return () => {
cancelado = true;
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, deps);

useEffect(() => cargar(), [cargar]);

return { ...estado, recargar: cargar };
}

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 780px)").matches : false
    );
    useEffect(() => {
    const mq = window.matchMedia("(max-width: 780px)");
    const onChange = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);
    return () => {
    if (mq.removeEventListener) mq.removeEventListener("change", onChange);
    else mq.removeListener(onChange);
    };
    }, []);
    return isMobile;
    }
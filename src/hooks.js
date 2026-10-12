import { useCallback, useEffect, useState } from "react";

// Carga una sección de datos de forma independiente: si el endpoint todavía
// no existe en el Apps Script (secciones nuevas: cuentas, metas, etc.) esa
// sección muestra su propio mensaje en vez de romper el resto de la app.
//
// "cargando" solo es true la primera vez (cuando no hay nada para mostrar).
// En las recargas posteriores los datos viejos quedan en pantalla y se usa
// "actualizando", así no parpadea todo después de cada guardado.
export function useSeccion(fetcher, deps = []) {
const [estado, setEstado] = useState({ data: null, cargando: true, actualizando: false, error: "" });

const cargar = useCallback(() => {
let cancelado = false;
setEstado((e) => ({ ...e, cargando: e.data === null, actualizando: e.data !== null, error: "" }));
fetcher()
.then((data) => {
if (!cancelado) setEstado({ data, cargando: false, actualizando: false, error: "" });
})
.catch((err) => {
if (!cancelado) {
setEstado((e) => ({ ...e, cargando: false, actualizando: false, error: err.message || "No se pudo cargar." }));
}
});
return () => {
cancelado = true;
};
// eslint-disable-next-line react-hooks/exhaustive-deps
}, deps);

useEffect(() => cargar(), [cargar]);

return { ...estado, recargar: cargar };
}

// Validación en vivo: los errores se calculan con cada tecla, pero un campo
// vacío recién se marca cuando lo dejaste (blur) o tocaste "Guardar", así no
// aparece todo en rojo apenas abrís el formulario.
export function useValidacion(valores, validar) {
const [tocados, setTocados] = useState({});
const [intentado, setIntentado] = useState(false);
const errores = validar(valores);

function visible(campo) {
const escrito = String(valores[campo] ?? "") !== "";
return intentado || tocados[campo] || escrito ? errores[campo] || "" : "";
}

function tocar(campo) {
setTocados((t) => (t[campo] ? t : { ...t, [campo]: true }));
}

// Marca el intento de envío y devuelve si el formulario es válido.
function intentar() {
setIntentado(true);
return Object.values(errores).every((e) => !e);
}

function reiniciar() {
setTocados({});
setIntentado(false);
}

return { errores, visible, tocar, intentar, reiniciar };
}

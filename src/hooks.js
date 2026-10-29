import { useCallback, useEffect, useRef, useState } from "react";

import { guardarCopia, leerCopia } from "./sinConexion";

// Carga una sección de datos de forma independiente: si el endpoint todavía
// no existe en el Apps Script (secciones nuevas: cuentas, metas, etc.) esa
// sección muestra su propio mensaje en vez de romper el resto de la app.
//
// "cargando" solo es true la primera vez (cuando no hay nada para mostrar).
// En las recargas posteriores los datos viejos quedan en pantalla y se usa
// "actualizando", así no parpadea todo después de cada guardado.
//
// Con "clave", la última respuesta buena queda guardada en el dispositivo:
// al abrir se muestra al toque (con o sin internet) mientras se actualiza.
// "sinRed" dice que el último intento no llegó a Google; "pedidoEn", cuándo
// se pidió lo que se está mostrando.
export function useSeccion(fetcher, deps = [], clave = "") {
const [estado, setEstado] = useState(() => {
const copia = clave ? leerCopia(clave) : null;
return copia
? { data: copia.data, cargando: false, actualizando: true, error: "", sinRed: false, pedidoEn: copia.cuando || 0 }
: { data: null, cargando: true, actualizando: false, error: "", sinRed: false, pedidoEn: 0 };
});
const ultimaClave = useRef(clave);

const cargar = useCallback(() => {
let cancelado = false;
// Cambió el período (otra clave): si hay copia de ese, se muestra ya.
const copia = clave && clave !== ultimaClave.current ? leerCopia(clave) : null;
ultimaClave.current = clave;
setEstado((e) => {
const data = copia ? copia.data : e.data;
return { ...e, data, pedidoEn: copia ? copia.cuando || 0 : e.pedidoEn, cargando: data === null, actualizando: data !== null, error: "" };
});
const pedidoEn = Date.now();
fetcher()
.then((data) => {
if (clave) guardarCopia(clave, data);
if (!cancelado) setEstado({ data, cargando: false, actualizando: false, error: "", sinRed: false, pedidoEn });
})
.catch((err) => {
if (!cancelado) {
setEstado((e) => ({ ...e, cargando: false, actualizando: false, error: err.message || "No se pudo cargar.", sinRed: !!err.sinRed }));
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

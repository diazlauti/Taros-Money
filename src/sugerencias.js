import { obtenerTokenActual, sesionRecordada } from "./auth";

// Ayudantes del formulario de sugerencias y errores (SugerenciaDialog).

const URL_CUENTA = "/.netlify/functions/cuenta";

// Le pide a la función de Netlify el mail de la sesión, verificado con Google,
// y arma el link «Comprobar» que llega en el mail. Si no se puede (sin
// internet, sin sesión, función sin configurar), el reporte igual sale, con
// el mail recordado marcado como «sin verificar».
export async function cuentaVerificada() {
  try {
    const token = await obtenerTokenActual();
    if (!token) throw new Error();
    const res = await fetch(URL_CUENTA, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const datos = await res.json();
    if (!res.ok || !datos.email || !datos.sello) throw new Error();
    const params = new URLSearchParams({ email: datos.email, fecha: datos.fecha, sello: datos.sello });
    return { cuenta: datos.email, comprobar: `${location.origin}${URL_CUENTA}?${params}` };
  } catch {
    const recordado = sesionRecordada()?.email;
    return { cuenta: recordado ? `${recordado} (sin verificar)` : "Sin verificar", comprobar: "" };
  }
}

// Una captura del celu pesa varios MB: se pasa a JPEG de hasta 1600 px de lado
// (unos 200 KB) para que entre de sobra en el cupo gratis de Netlify.
const LADO_MAXIMO = 1600;
const CALIDAD = 0.75;
export const PESO_MAXIMO = 5 * 1024 * 1024;

export async function achicarCaptura(archivo) {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close?.();
    const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/jpeg", CALIDAD));
    if (blob && blob.size < archivo.size) return new File([blob], "captura.jpg", { type: "image/jpeg" });
  } catch {
    /* si el navegador no puede achicarla, va la original (si no es enorme) */
  }
  return archivo.size <= PESO_MAXIMO ? archivo : null;
}

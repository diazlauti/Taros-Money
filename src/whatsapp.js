// Bot de WhatsApp: el número del bot se carga en Netlify (VITE_WA_NUMERO,
// solo dígitos con código de país, ej. 5491112345678). Sin número, la
// opción no aparece.
const NUMERO = String(import.meta.env.VITE_WA_NUMERO || "").replace(/\D/g, "");

export function whatsappConfigurado() {
  return NUMERO.length >= 8;
}

// Abre el chat con el bot. Con "texto" el mensaje ya viene escrito.
export function linkWhatsApp(texto = "") {
  return `https://wa.me/${NUMERO}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

// Para agregar el banco sin saber de qué mail escribe. Algunos mandan desde
// más de un dominio, por eso cada uno puede sumar varios.
export const BANCOS = [
  { nombre: "Galicia", dominios: ["galicia.com.ar", "bancogalicia.com.ar"] },
  { nombre: "Santander", dominios: ["santander.com.ar"] },
  { nombre: "BBVA", dominios: ["bbva.com.ar"] },
  { nombre: "Macro", dominios: ["macro.com.ar"] },
  { nombre: "Nación", dominios: ["bna.com.ar"] },
  { nombre: "Provincia", dominios: ["bancoprovincia.com.ar"] },
  { nombre: "ICBC", dominios: ["icbc.com.ar"] },
  { nombre: "Naranja X", dominios: ["naranjax.com"] },
  { nombre: "Ualá", dominios: ["uala.com.ar"] },
  { nombre: "Brubank", dominios: ["brubank.com"] },
  { nombre: "Personal Pay", dominios: ["personalpay.com.ar"] },
  { nombre: "MODO", dominios: ["modo.com.ar"] },
];

// Nombres para mostrar de los remitentes que cargó la persona: el banco si
// es uno conocido, si no la parte del dominio ("alertas@tubanco.com.ar" →
// "tubanco"). Sin repetidos.
export function nombresDeRemitentes(remitentes = []) {
  const nombres = remitentes.map((r) => {
    const valor = String(r).toLowerCase().trim();
    const dominio = valor.includes("@") ? valor.split("@")[1] : valor;
    const banco = BANCOS.find((b) => b.dominios.some((d) => dominio === d || dominio.endsWith(`.${d}`)));
    if (banco) return banco.nombre;
    const base = dominio.split(".")[0] || valor;
    return base.charAt(0).toUpperCase() + base.slice(1);
  });
  return [...new Set(nombres)];
}

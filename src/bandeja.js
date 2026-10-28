// Lo que aparece en Notificaciones: lo que hay para hacer (mails para
// revisar, servicios por vencer, suscripciones que se cobran pronto) y las
// novedades de la app. Qué se vio se recuerda en este dispositivo.
import { fmtMoney } from "./format";
import { NOVEDADES } from "./novedades";
import { DIAS_AVISO, textoVencimiento } from "./servicios";

const CLAVE_VISTAS = "taros-notis-vistas";
const MAX_VISTAS = 300;

// Días que faltan para el próximo cobro (0 = hoy). Si el día no existe en
// el mes (31 en noviembre), se cobra el último día.
export function diasHastaCobro(diaCobro, ahora = new Date()) {
  const dia = Number(diaCobro);
  if (!dia) return null;
  const anio = ahora.getFullYear();
  const mes = ahora.getMonth();
  const hoy = ahora.getDate();
  const ultimoEste = new Date(anio, mes + 1, 0).getDate();
  const esteMes = Math.min(dia, ultimoEste);
  if (esteMes >= hoy) return esteMes - hoy;
  const ultimoProximo = new Date(anio, mes + 2, 0).getDate();
  return ultimoEste - hoy + Math.min(dia, ultimoProximo);
}

function textoCobro(dias) {
  if (dias === 0) return "se cobra hoy";
  if (dias === 1) return "se cobra mañana";
  return `se cobra en ${dias} días`;
}

function fechaDeHoyMas(dias, ahora) {
  const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "servicios" ya viene con estado (serviciosConEstado). Cada pendiente tiene
// un id que cambia cuando cambia la situación (otro mes, de "vence pronto" a
// "vencido", más mails), así vuelve a marcarse como nuevo.
export function armarPendientes({ cantidadARevisar = 0, servicios = [], suscripciones = [], monedaPorCuenta = {}, ahora = new Date() }) {
  const lista = [];

  if (cantidadARevisar > 0) {
    lista.push({
      id: `mails-${cantidadARevisar}`,
      tipo: "mails",
      icono: "ph ph-envelope-simple",
      titulo:
        cantidadARevisar === 1
          ? "Encontré 1 movimiento en tus mails para revisar"
          : `Encontré ${cantidadARevisar} movimientos en tus mails para revisar`,
      texto: "Confirmalos o corregilos en Movimientos.",
      accion: { texto: "Revisar", tab: "movimientos", filtro: "revisar" },
    });
  }

  servicios
    .filter((s) => s.estado === "vencido" || s.estado === "pronto")
    .forEach((s) => {
      lista.push({
        id: `serv-${s.nombre}-${s.vencimiento}-${s.estado}`,
        tipo: s.estado === "vencido" ? "urgente" : "servicio",
        icono: s.estado === "vencido" ? "ph ph-warning-circle" : "ph ph-clock",
        titulo: `${s.nombre}: ${textoVencimiento(s).toLowerCase()}`,
        texto: s.monto ? `Son ${fmtMoney(s.monto, monedaPorCuenta[s.cuenta] || "ARS")}.` : "",
        accion: { texto: "Ver servicios", tab: "servicios" },
      });
    });

  suscripciones
    .map((s) => ({ ...s, dias: diasHastaCobro(s.diaCobro, ahora) }))
    .filter((s) => s.dias !== null && s.dias <= DIAS_AVISO)
    .sort((a, b) => a.dias - b.dias)
    .forEach((s) => {
      const moneda = monedaPorCuenta[s.cuenta] || "ARS";
      lista.push({
        id: `sub-${s.nombre}-${fechaDeHoyMas(s.dias, ahora)}`,
        tipo: "suscripcion",
        icono: "ph ph-repeat",
        titulo: `${s.nombre} ${textoCobro(s.dias)}`,
        texto: `${fmtMoney(s.monto, moneda)}${s.cuenta ? ` de ${s.cuenta}` : ""}.`,
        accion: { texto: "Ver suscripciones", tab: "recurrentes" },
      });
    });

  return lista;
}

export function leerVistas() {
  try {
    const crudo = localStorage.getItem(CLAVE_VISTAS);
    if (crudo === null) {
      // Primera vez: solo la novedad más reciente cuenta como nueva, así no
      // aparece con 9 avisos de golpe.
      const iniciales = NOVEDADES.slice(1).map((n) => n.id);
      localStorage.setItem(CLAVE_VISTAS, JSON.stringify(iniciales));
      return new Set(iniciales);
    }
    return new Set(JSON.parse(crudo));
  } catch {
    return new Set(NOVEDADES.slice(1).map((n) => n.id));
  }
}

export function marcarVistas(ids) {
  try {
    const vistas = leerVistas();
    ids.forEach((id) => vistas.add(id));
    // Las novedades se guardan siempre; de lo demás, solo lo último.
    const novedades = new Set(NOVEDADES.map((n) => n.id));
    const resto = [...vistas].filter((id) => !novedades.has(id)).slice(-MAX_VISTAS);
    localStorage.setItem(CLAVE_VISTAS, JSON.stringify([...[...vistas].filter((id) => novedades.has(id)), ...resto]));
  } catch {
    /* sin storage: el número vuelve a aparecer, no es grave */
  }
}

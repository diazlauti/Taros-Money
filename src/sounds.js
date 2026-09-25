// Sonidos cortos generados con Web Audio API — nada de archivos de audio
// externos que licenciar ni descargar. Se pueden silenciar del todo con el
// toggle del menú (persiste en localStorage).

const STORAGE_KEY = "taros-sonido";
let ctx = null;

function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function sonidoHabilitado() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function toggleSonido() {
  const nuevo = !sonidoHabilitado();
  try {
    localStorage.setItem(STORAGE_KEY, nuevo ? "on" : "off");
  } catch {
    /* modo privado o storage bloqueado: no persiste, pero no rompe nada */
  }
  return nuevo;
}

function tono({ freq, duracion = 0.12, tipo = "sine", volumen = 0.07, delay = 0 }) {
  if (!sonidoHabilitado()) return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  try {
    const inicio = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, inicio);
    gain.gain.setValueAtTime(volumen, inicio);
    gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracion);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(inicio);
    osc.stop(inicio + duracion + 0.02);
  } catch {
    /* si el navegador bloqueó el audio (falta interacción previa), no pasa nada */
  }
}

export function playClick() {
  tono({ freq: 480, duracion: 0.06, tipo: "square", volumen: 0.05 });
}

export function playSuccess() {
  tono({ freq: 660, duracion: 0.1 });
  tono({ freq: 880, duracion: 0.14, delay: 0.08 });
}

export function playError() {
  tono({ freq: 220, duracion: 0.16, tipo: "sawtooth", volumen: 0.06 });
}

export function playChime() {
  tono({ freq: 784, duracion: 0.12 });
  tono({ freq: 988, duracion: 0.12, delay: 0.1 });
  tono({ freq: 1318, duracion: 0.24, delay: 0.2 });
}

// Sonidos cortos generados con Web Audio API — nada de archivos de audio
// externos que licenciar ni descargar. Se pueden silenciar del todo con el
// toggle de Configuración (persiste en localStorage). En iPhone, con el
// celu en silencio no suenan (igual que cualquier app).

const STORAGE_KEY = "taros-sonido";
let ctx = null;
let salida = null;

function crearContexto() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) {
    ctx = new AudioCtx();
    salida = ctx.createGain();
    salida.gain.value = 1;
    salida.connect(ctx.destination);
  }
  return ctx;
}

function getContext() {
  const audioCtx = crearContexto();
  // "suspended" o "interrupted" (iPhone al volver de otra app).
  if (audioCtx && audioCtx.state !== "running") audioCtx.resume?.().catch?.(() => {});
  return audioCtx;
}

// Los navegadores del celu (sobre todo Safari) solo dejan sonar si el audio
// se arranca dentro de un toque. Casi todos los sonidos de la app suenan
// después de que responde el servidor, fuera del toque, y por eso no se
// escuchaba nada. Acá se destraba con cualquier toque o tecla: se reanuda el
// contexto y se pasa un sonido mudo. Queda escuchando porque el celu lo
// vuelve a frenar cuando la app pasa a segundo plano.
let preparado = false;
export function prepararSonido() {
  if (preparado || typeof window === "undefined") return;
  preparado = true;
  const destrabar = () => {
    if (!sonidoHabilitado()) return;
    const audioCtx = crearContexto();
    if (!audioCtx || audioCtx.state === "running") return;
    try {
      audioCtx.resume?.().catch?.(() => {});
      const mudo = audioCtx.createBuffer(1, 1, 22050);
      const fuente = audioCtx.createBufferSource();
      fuente.buffer = mudo;
      fuente.connect(audioCtx.destination);
      fuente.start(0);
    } catch {
      /* el navegador no lo permitió: se prueba en el próximo toque */
    }
  };
  ["pointerdown", "touchend", "keydown"].forEach((evento) =>
    window.addEventListener(evento, destrabar, { capture: true, passive: true }),
  );
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

// Una nota suave tipo marimba: entra en unos milisegundos (sin "clic") y se
// apaga sola. Con "hasta", la nota se desliza a otra frecuencia (el "fiu").
// "brillo" suma un armónico agudo que se apaga rápido, como un golpe de
// madera.
function nota({ freq, hasta, duracion = 0.16, tipo = "sine", volumen = 0.12, delay = 0, brillo = 0 }) {
  const audioCtx = getContext();
  if (!audioCtx || !salida) return;
  try {
    const inicio = audioCtx.currentTime + 0.005 + delay;
    const fin = inicio + duracion;
    const capas = [{ f: freq, v: volumen, d: duracion }];
    if (brillo) capas.push({ f: freq * 4, v: volumen * brillo, d: Math.min(0.05, duracion) });
    capas.forEach(({ f, v, d }, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = i === 0 ? tipo : "sine";
      osc.frequency.setValueAtTime(f, inicio);
      if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta * (f / freq), fin);
      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.linearRampToValueAtTime(v, inicio + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, inicio + d);
      osc.connect(gain);
      gain.connect(salida);
      osc.start(inicio);
      osc.stop(fin + 0.03);
    });
  } catch {
    /* si el navegador bloqueó el audio, no pasa nada */
  }
}

// Si dos partes de la app piden el mismo sonido casi a la vez, suena uno.
const ultimo = {};
function sonar(nombre, fn) {
  if (!sonidoHabilitado()) return;
  const ahora = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (ultimo[nombre] && ahora - ultimo[nombre] < 80) return;
  ultimo[nombre] = ahora;
  fn();
}

// Toque común: abrir algo, elegir una opción.
export function playClick() {
  sonar("click", () => nota({ freq: 880, duracion: 0.06, tipo: "triangle", volumen: 0.07, brillo: 0.15 }));
}

// Casi imperceptible: cambiar de sección.
export function playTic() {
  sonar("tic", () => nota({ freq: 1320, duracion: 0.035, volumen: 0.035 }));
}

export function playSuccess() {
  sonar("exito", () => {
    nota({ freq: 659, duracion: 0.14, volumen: 0.11, brillo: 0.2 });
    nota({ freq: 988, duracion: 0.22, volumen: 0.1, brillo: 0.2, delay: 0.08 });
  });
}

// Dos notas graves que bajan: avisa sin sonar a alarma.
export function playError() {
  sonar("error", () => {
    nota({ freq: 392, duracion: 0.14, tipo: "triangle", volumen: 0.12 });
    nota({ freq: 311, duracion: 0.22, tipo: "triangle", volumen: 0.11, delay: 0.1 });
  });
}

// Algo que se va: un "fiu" corto que baja.
export function playBorrar() {
  sonar("borrar", () => nota({ freq: 740, hasta: 330, duracion: 0.16, tipo: "triangle", volumen: 0.09 }));
}

// Lo contrario de borrar: sube y cierra con una nota.
export function playDeshacer() {
  sonar("deshacer", () => {
    nota({ freq: 330, hasta: 740, duracion: 0.14, tipo: "triangle", volumen: 0.08 });
    nota({ freq: 988, duracion: 0.18, volumen: 0.08, brillo: 0.2, delay: 0.12 });
  });
}

// Al abrirse un «¿Seguro?»: una nota grave y suave, para frenar un segundo.
export function playAtencion() {
  sonar("atencion", () => nota({ freq: 523, duracion: 0.2, tipo: "triangle", volumen: 0.08 }));
}

export function playChime() {
  sonar("chime", () => {
    nota({ freq: 784, duracion: 0.14, volumen: 0.09, brillo: 0.2 });
    nota({ freq: 988, duracion: 0.14, volumen: 0.09, brillo: 0.2, delay: 0.1 });
    nota({ freq: 1319, duracion: 0.3, volumen: 0.08, brillo: 0.2, delay: 0.2 });
  });
}

// Recorrido de primera vez: cada paso sube un poquito de tono, así se
// siente que se avanza; volver atrás baja.
const ESCALA_PASOS = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319];

export function playPaso(indice, atras = false) {
  const freq = ESCALA_PASOS[Math.min(indice, ESCALA_PASOS.length - 1)];
  sonar("paso", () => {
    if (atras) {
      nota({ freq, duracion: 0.09, tipo: "triangle", volumen: 0.07 });
      nota({ freq: freq * 0.84, duracion: 0.12, tipo: "triangle", volumen: 0.06, delay: 0.06 });
      return;
    }
    nota({ freq: freq * 0.84, duracion: 0.08, tipo: "triangle", volumen: 0.06 });
    nota({ freq, duracion: 0.14, tipo: "triangle", volumen: 0.07, brillo: 0.15, delay: 0.06 });
  });
}

export function playFestejo() {
  sonar("festejo", () => {
    [523, 659, 784, 1047].forEach((freq, i) =>
      nota({ freq, duracion: 0.18, tipo: "triangle", volumen: 0.08, brillo: 0.15, delay: i * 0.09 }),
    );
    nota({ freq: 1568, duracion: 0.35, volumen: 0.05, delay: 0.38 });
  });
}

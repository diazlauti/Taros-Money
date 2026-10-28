import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvisosContext } from "../avisos";
import { avisarDelError } from "../reportarError";

// Duraciones de los tokens --dur-aviso / --dur-aviso-accion de index.css
// (con un valor de respaldo). Ojo: al compilar, el CSS minificado pasa
// "3200ms" a "3.2s", así que hay que entender las dos unidades.
function duracion(token, respaldo) {
  const crudo = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const numero = parseFloat(crudo);
  if (!Number.isFinite(numero)) return respaldo;
  return crudo.endsWith("ms") ? numero : crudo.endsWith("s") ? numero * 1000 : numero;
}

// Muestra avisos cortos abajo de la pantalla y los anuncia a lectores de
// pantalla (role="status" = aria-live polite). Un aviso puede traer un
// botón (ej. «Deshacer»): esos duran más y no se van mientras tenés el
// mouse o el foco encima, así da tiempo a tocarlo.
export default function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([]);
  const siguienteId = useRef(0);
  const timers = useRef(new Map());
  const pausado = useRef(false);
  // Los avisos en pantalla, para no repetir uno que ya se ve.
  const visibles = useRef([]);
  useEffect(() => {
    visibles.current = avisos;
  }, [avisos]);

  const sacar = useCallback((id) => {
    clearTimeout(timers.current.get(id)?.timeout);
    timers.current.delete(id);
    setAvisos((a) => a.filter((x) => x.id !== id));
  }, []);

  const programar = useCallback(
    (id, ms) => {
      const timeout = setTimeout(() => sacar(id), ms);
      timers.current.set(id, { timeout, ms });
    },
    [sacar],
  );

  const avisar = useCallback(
    (texto, tipo = "exito", opciones = {}) => {
      const id = siguienteId.current++;
      let { accion, onAccion } = opciones;
      // El mismo aviso repetido (ej. tocar varias veces un botón que falla)
      // no se apila: queda uno solo.
      if (!accion && visibles.current.some((x) => x.texto === texto && x.tipo === tipo)) return;
      // Los errores traen «Avisar» para mandárselo al admin con un toque.
      if (tipo === "error" && !accion) {
        accion = "Avisar";
        onAccion = () => avisarDelError(texto);
      }
      setAvisos((a) => [...a, { id, texto, tipo, accion, onAccion }]);
      const ms = accion ? duracion("--dur-aviso-accion", 8000) : duracion("--dur-aviso", 3200);
      if (pausado.current) timers.current.set(id, { timeout: null, ms });
      else programar(id, ms);
    },
    [programar],
  );

  function pausar() {
    pausado.current = true;
    for (const t of timers.current.values()) clearTimeout(t.timeout);
  }

  function reanudar(e) {
    // Si el foco solo se movió a otro botón de los avisos, sigue en pausa.
    if (e?.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
    if (!pausado.current) return;
    pausado.current = false;
    for (const [id, t] of [...timers.current.entries()]) programar(id, t.ms);
  }

  useEffect(() => {
    const mapa = timers.current;
    return () => {
      for (const t of mapa.values()) clearTimeout(t.timeout);
    };
  }, []);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div
        className="avisos"
        role="status"
        aria-live="polite"
        onMouseEnter={pausar}
        onMouseLeave={reanudar}
        onFocus={pausar}
        onBlur={reanudar}
      >
        {avisos.map((a) => (
          <div key={a.id} className={"aviso" + (a.tipo === "error" ? " aviso--error" : "") + (a.accion ? " aviso--accion" : "")}>
            <i className={a.tipo === "error" ? "ph ph-warning-circle" : "ph ph-check-circle"} aria-hidden="true" />
            {a.texto}
            {a.accion && (
              <button
                type="button"
                className="btn btn-texto aviso-boton"
                onClick={() => {
                  sacar(a.id);
                  reanudar();
                  a.onAccion?.();
                }}
              >
                {a.accion}
              </button>
            )}
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  );
}

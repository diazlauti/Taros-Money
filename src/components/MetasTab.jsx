import { useRef, useState } from "react";
import { crearMeta, aportarMeta } from "../api";
import { useAvisos } from "../avisos";
import { fmtMoney, parseMonto } from "../format";
import { useValidacion } from "../hooks";
import { playChime, playError, playSuccess } from "../sounds";
import { errorMonto, errorNombreNuevo } from "../validaciones";
import Campo from "./Campo";
import EditarMetaDialog from "./EditarMetaDialog";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";
import MontoDialog from "./MontoDialog";

const VACIO = { nombre: "", objetivo: "" };

export default function MetasTab({ metas, onCambio }) {
  const { avisar } = useAvisos();
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [aportando, setAportando] = useState(null);
  const [editando, setEditando] = useState(null);
  const nombreRef = useRef(null);
  const lista = metas.data || [];
  const v = useValidacion(form, (f) => ({
    nombre: errorNombreNuevo(f.nombre, lista.map((m) => m.nombre), "meta"),
    objetivo: errorMonto(f.objetivo),
  }));

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function agregar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    setEnviando(true);
    setErrorForm("");
    try {
      await crearMeta({ nombre: form.nombre.trim(), objetivo: parseMonto(form.objetivo), actual: 0 });
      playSuccess();
      avisar("Meta creada");
      setForm(VACIO);
      v.reiniciar();
      onCambio?.();
    } catch (err) {
      playError();
      setErrorForm(err.message || "No se pudo crear la meta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  async function aportar(monto) {
    const meta = aportando;
    try {
      await aportarMeta(meta.nombre, monto);
    } catch (err) {
      playError();
      throw err;
    }
    const llegoAlObjetivo = meta.objetivo > 0 && meta.actual < meta.objetivo && meta.actual + monto >= meta.objetivo;
    if (llegoAlObjetivo) {
      playChime();
      avisar(`¡Llegaste a la meta "${meta.nombre}"!`);
    } else {
      playSuccess();
      avisar("Aporte guardado");
    }
    onCambio?.();
  }

  let contenido;
  if (metas.cargando) {
    contenido = (
      <Cargando texto="Cargando metas…">
        <div className="grid-cards">
          {[0, 1].map((i) => (
            <div className="card" key={i}>
              <Skeleton ancho="50%" />
              <Skeleton ancho="70%" />
              <Skeleton />
              <Skeleton variante="boton" />
            </div>
          ))}
        </div>
      </Cargando>
    );
  } else if (metas.error && !metas.data) {
    contenido = (
      <div className="card">
        <ErrorEstado mensaje={metas.error} onReintentar={metas.recargar} />
      </div>
    );
  } else if (lista.length === 0) {
    contenido = (
      <div className="card">
        <Vacio icono="ph ph-target" texto="Todavía no tenés metas de ahorro. Creá una (vacaciones, un fondo de emergencia…) y andá sumando aportes.">
          <button type="button" className="btn btn-secondary" onClick={() => nombreRef.current?.focus()}>
            <i className="ph ph-plus" aria-hidden="true" />
            Crear meta
          </button>
        </Vacio>
      </div>
    );
  } else {
    contenido = (
      <ul className="lista grid-cards">
        {lista.map((g) => {
          const pct = Math.min(100, Math.round((g.actual / g.objetivo) * 100) || 0);
          return (
            <li className="card" key={g.nombre}>
              <div className="fila-separada">
                <h2 className="card-title">{g.nombre}</h2>
                <button type="button" className="btn btn-icono" onClick={() => setEditando(g)} aria-label={`Editar ${g.nombre}`}>
                  <i className="ph ph-pencil-simple" aria-hidden="true" />
                </button>
              </div>
              <div className="fila-separada">
                <span className="texto-tenue">
                  {fmtMoney(g.actual)} de {fmtMoney(g.objetivo)}
                </span>
                <span className="negrita">{pct}%</span>
              </div>
              <div
                className="progreso-pista"
                role="progressbar"
                aria-label={`Progreso de ${g.nombre}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
              >
                <div className="progreso-relleno" style={{ "--pct": `${pct}%` }} />
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setAportando(g)}>
                <i className="ph ph-plus" aria-hidden="true" />
                Sumar aporte
              </button>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {contenido}

      <form className="card form ancho-form" onSubmit={agregar} noValidate aria-labelledby="titulo-nueva-meta">
        <h2 className="card-kicker" id="titulo-nueva-meta">
          Nueva meta
        </h2>
        <div className="fila-2">
          <Campo etiqueta="Nombre" error={v.visible("nombre")}>
            {(p) => (
              <input
                {...p}
                ref={nombreRef}
                className="input"
                value={form.nombre}
                onChange={(e) => campo("nombre", e.target.value)}
                onBlur={() => v.tocar("nombre")}
                placeholder="Ej: Vacaciones"
              />
            )}
          </Campo>
          <Campo etiqueta="Cuánto querés juntar" error={v.visible("objetivo")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.objetivo}
                onChange={(e) => campo("objetivo", e.target.value)}
                onBlur={() => v.tocar("objetivo")}
                placeholder="0"
              />
            )}
          </Campo>
        </div>
        {errorForm && (
          <p className="mensaje-error" role="alert">
            {errorForm}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : errorForm ? "Reintentar" : "Crear meta"}
        </button>
      </form>

      {editando && (
        <EditarMetaDialog
          meta={editando}
          otrosNombres={lista.filter((m) => m.nombre !== editando.nombre).map((m) => m.nombre)}
          onClose={() => setEditando(null)}
          onGuardado={onCambio}
        />
      )}

      {aportando && (
        <MontoDialog
          titulo={`Sumar a "${aportando.nombre}"`}
          etiqueta="Cuánto sumás"
          ayuda={`Llevás ${fmtMoney(aportando.actual)} de ${fmtMoney(aportando.objetivo)}`}
          textoBoton="Sumar aporte"
          onConfirmar={aportar}
          onClose={() => setAportando(null)}
        />
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { NOVEDADES } from "../novedades";
import { fmtFecha } from "../format";
import Dialog from "./Dialog";
import { Cargando, ErrorEstado, SkeletonFilas } from "./Estado";
import { Insignia } from "./Layout";

// Panel de Notificaciones con dos pestañas: «Avisos» (lo que hay para
// hacer) y «Novedades» (lo nuevo de la app), cada una con su número de lo
// que no viste. "vistasAlAbrir" es lo que ya se había visto antes de abrirlo:
// lo demás se marca con «Nuevo» mientras el panel está abierto.
export default function NotificacionesDialog({ pendientes, cargando, errores, vistasAlAbrir, vistas, onVer, onIr, onClose }) {
  const sinVerAvisos = pendientes.filter((p) => !vistas.has(p.id)).length;
  const sinVerNovedades = NOVEDADES.filter((n) => !vistas.has(n.id)).length;
  // Abre en Avisos, salvo que solo haya novedades sin ver.
  const [pestana, setPestana] = useState(() => (sinVerAvisos === 0 && sinVerNovedades > 0 ? "novedades" : "avisos"));
  const [verTodas, setVerTodas] = useState(false);
  const novedades = verTodas ? NOVEDADES : NOVEDADES.slice(0, 5);
  const esNueva = (id) => !vistasAlAbrir.has(id);

  // Lo de la pestaña que estás mirando queda visto (también si llega algo
  // nuevo con el panel abierto).
  const idsPestana = (pestana === "avisos" ? pendientes.map((p) => p.id) : NOVEDADES.map((n) => n.id)).join("|");
  useEffect(() => {
    if (idsPestana) onVer(idsPestana.split("|"));
  }, [idsPestana, onVer]);

  const pestanas = [
    ["avisos", "Avisos", "ph ph-bell", sinVerAvisos],
    ["novedades", "Novedades", "ph ph-sparkle", sinVerNovedades],
  ];

  let contenidoPendientes;
  if (cargando && pendientes.length === 0) {
    contenidoPendientes = (
      <Cargando texto="Buscando avisos…">
        <SkeletonFilas cantidad={2} />
      </Cargando>
    );
  } else {
    contenidoPendientes = (
      <>
        {errores.map((e) => (
          <ErrorEstado key={e.cual} mensaje={`No pude revisar ${e.cual}: ${e.mensaje}`} onReintentar={e.reintentar} />
        ))}
        {pendientes.length === 0 && errores.length === 0 ? (
          <p className="notis-al-dia">
            <i className="ph ph-check-circle" aria-hidden="true" />
            Estás al día: no hay nada para revisar ni por vencer.
          </p>
        ) : (
          <ul className="lista notis-lista">
            {pendientes.map((p) => (
              <li key={p.id} className={`noti noti--${p.tipo}`}>
                <i className={`${p.icono} noti-icono`} aria-hidden="true" />
                <div className="noti-cuerpo">
                  <p className="noti-titulo">
                    {p.titulo}
                    {esNueva(p.id) && <span className="tag tag-nuevo">Nuevo</span>}
                  </p>
                  <p className="texto-chico texto-tenue">{p.texto}</p>
                  <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={() => onIr(p.accion)}>
                    {p.accion.texto}
                    <i className="ph ph-arrow-right" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <Dialog titulo="Notificaciones" onClose={onClose}>
      <div className="notis">
        <fieldset className="field">
          <legend className="visualmente-oculto">Qué ver</legend>
          <div className="seg seg-ancho">
            {pestanas.map(([valor, texto, icono, sinVer]) => (
              <label className="seg-opt" key={valor}>
                <input type="radio" name="notis-pestana" checked={pestana === valor} onChange={() => setPestana(valor)} />
                <span className="con-insignia">
                  <i className={icono} aria-hidden="true" />
                  <Insignia aviso={sinVer ? { cantidad: sinVer } : null} />
                </span>
                {texto}
                {sinVer > 0 && <span className="visualmente-oculto">, {sinVer} sin ver</span>}
              </label>
            ))}
          </div>
        </fieldset>

        {pestana === "avisos" ? (
          <section aria-label="Avisos">{contenidoPendientes}</section>
        ) : (
          <section aria-label="Novedades de la app">
            <ul className="lista notis-lista">
              {novedades.map((n) => (
                <li key={n.id} className="noti noti--novedad">
                  <i className={`${n.icono} noti-icono`} aria-hidden="true" />
                  <div className="noti-cuerpo">
                    <p className="noti-titulo">
                      {n.titulo}
                      {esNueva(n.id) && <span className="tag tag-nuevo">Nuevo</span>}
                    </p>
                    <p className="texto-chico texto-tenue">{n.texto}</p>
                    <p className="texto-chico texto-tenue">{fmtFecha(n.fecha)}</p>
                  </div>
                </li>
              ))}
            </ul>
            {NOVEDADES.length > 5 && (
              <button type="button" className="btn btn-texto btn-alinear-inicio" onClick={() => setVerTodas((v) => !v)} aria-expanded={verTodas}>
                <i className={verTodas ? "ph ph-caret-up" : "ph ph-caret-down"} aria-hidden="true" />
                {verTodas ? "Ver menos" : `Ver todas (${NOVEDADES.length})`}
              </button>
            )}
          </section>
        )}

        <button type="button" className="btn btn-primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Dialog>
  );
}

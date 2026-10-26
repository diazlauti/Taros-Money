import { useState } from "react";
import { NOVEDADES } from "../novedades";
import { fmtFecha } from "../format";
import Dialog from "./Dialog";
import { Cargando, ErrorEstado, SkeletonFilas } from "./Estado";

// Panel de Notificaciones: arriba lo que hay para hacer, abajo lo nuevo de
// la app. "vistasAlAbrir" es lo que ya se había visto antes de abrirlo: lo
// demás se marca con «Nuevo» mientras el panel está abierto.
export default function NotificacionesDialog({ pendientes, cargando, errores, vistasAlAbrir, onIr, onClose }) {
  const [verTodas, setVerTodas] = useState(false);
  const novedades = verTodas ? NOVEDADES : NOVEDADES.slice(0, 3);
  const esNueva = (id) => !vistasAlAbrir.has(id);

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
        <section aria-labelledby="notis-pendientes">
          <h3 className="card-kicker" id="notis-pendientes">
            Para hacer
          </h3>
          {contenidoPendientes}
        </section>

        <section aria-labelledby="notis-novedades">
          <h3 className="card-kicker" id="notis-novedades">
            Novedades de la app
          </h3>
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
          {NOVEDADES.length > 3 && (
            <button type="button" className="btn btn-texto btn-alinear-inicio" onClick={() => setVerTodas((v) => !v)} aria-expanded={verTodas}>
              <i className={verTodas ? "ph ph-caret-up" : "ph ph-caret-down"} aria-hidden="true" />
              {verTodas ? "Ver menos" : `Ver todas (${NOVEDADES.length})`}
            </button>
          )}
        </section>

        <button type="button" className="btn btn-primary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Dialog>
  );
}

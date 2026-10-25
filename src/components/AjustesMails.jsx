import { useState } from "react";
import { getAjustesMails, guardarAjustesMails } from "../api";
import { useAvisos } from "../avisos";
import { useSeccion } from "../hooks";
import { notificacionesSoportadas, notificar, pedirPermisoNotificaciones, permisoNotificaciones } from "../notificaciones";
import { playError, playSuccess } from "../sounds";
import { BANCOS } from "../bancosMails";
import Campo from "./Campo";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

// Búsqueda personalizada (remitentes y palabras), aviso por mail del modo
// "siempre" y notificaciones en este dispositivo. Solo se muestra con la
// detección de mails prendida.

export default function AjustesMails({ modo }) {
  const { avisar } = useAvisos();
  const ajustes = useSeccion(() => getAjustesMails(), []);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");
  const [permisoAvisos, setPermisoAvisos] = useState(permisoNotificaciones);

  // Si el permiso de Gmail venció, este click abre la ventana de Google.
  async function darPermiso() {
    try {
      await getAjustesMails({ interactivo: true });
      ajustes.recargar();
    } catch (err) {
      setErrorGuardar(err.message || "No se pudo dar el permiso. Probá de nuevo.");
    }
  }

  async function guardar(cambios, mensaje) {
    const nuevos = { ...ajustes.data, ...cambios };
    setGuardando(true);
    setErrorGuardar("");
    try {
      await guardarAjustesMails(nuevos, { interactivo: true });
      ajustes.recargar();
      playSuccess();
      avisar(mensaje);
      return true;
    } catch (err) {
      playError();
      setErrorGuardar(err.message || "No se pudo guardar. Probá de nuevo.");
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function activarAvisos() {
    const permiso = await pedirPermisoNotificaciones();
    setPermisoAvisos(permiso);
    if (permiso === "granted") {
      notificar("Taros Money", "Listo: acá te voy a avisar cuando encuentre gastos en tus mails.");
    }
  }

  let avisosDispositivo;
  if (!notificacionesSoportadas()) {
    avisosDispositivo = <p className="field-ayuda">Este navegador no permite notificaciones.</p>;
  } else if (permisoAvisos === "granted") {
    avisosDispositivo = (
      <p className="aviso-inline">
        <i className="ph ph-bell-ringing" aria-hidden="true" />
        Las notificaciones están activadas en este dispositivo.
      </p>
    );
  } else if (permisoAvisos === "denied") {
    avisosDispositivo = (
      <p className="field-ayuda">
        Las notificaciones están bloqueadas para esta app. Habilitalas desde los ajustes del navegador o del celular.
      </p>
    );
  } else {
    avisosDispositivo = (
      <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={activarAvisos}>
        <i className="ph ph-bell" aria-hidden="true" />
        Activar notificaciones en este dispositivo
      </button>
    );
  }

  let reglas;
  if (ajustes.cargando) {
    reglas = (
      <Cargando texto="Cargando tu búsqueda personalizada…">
        <Skeleton ancho="70%" />
        <Skeleton ancho="50%" />
      </Cargando>
    );
  } else if (ajustes.error && !ajustes.data) {
    reglas = (
      <>
        <ErrorEstado mensaje={ajustes.error} onReintentar={ajustes.recargar} />
        <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={darPermiso}>
          <i className="ph ph-key" aria-hidden="true" />
          Volver a dar permiso de Gmail
        </button>
      </>
    );
  } else {
    const data = ajustes.data;
    reglas = (
      <>
        <ListaReglas
          titulo="Remitentes de tus bancos o billeteras"
          ayuda="¿Tu banco no está? Escribí el mail o el dominio que te manda los avisos. Ej: alertas@tubanco.com.ar o tubanco.com.ar"
          placeholder="alertas@tubanco.com.ar"
          tipo="email"
          sugeridos={BANCOS}
          lista={data.remitentes}
          deshabilitado={guardando}
          onCambiar={(remitentes, mensaje) => guardar({ remitentes }, mensaje)}
        />
        <ListaReglas
          titulo="Palabras o frases para buscar"
          ayuda='Algo que aparezca en tus mails de gastos. Ej: "consumo aprobado" o "pagaste con"'
          placeholder="consumo aprobado"
          tipo="text"
          lista={data.palabras}
          deshabilitado={guardando}
          onCambiar={(palabras, mensaje) => guardar({ palabras }, mensaje)}
        />
        {data.ignorados?.length > 0 && (
          <ListaReglas
            titulo="Remitentes ignorados"
            ayuda="Sus mails no se revisan. Sacalos de la lista para volver a verlos."
            placeholder="Nombre del remitente"
            tipo="text"
            lista={data.ignorados}
            deshabilitado={guardando}
            onCambiar={(ignorados, mensaje) => guardar({ ignorados }, mensaje)}
          />
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={data.avisarPorMail}
            disabled={guardando}
            onChange={(e) =>
              guardar(
                { avisarPorMail: e.target.checked },
                e.target.checked ? "Te vamos a avisar por mail" : "Ya no te avisamos por mail"
              )
            }
          />
          <span>
            Avisarme por mail cuando encuentre algo
            <span className="field-ayuda">
              {modo === "siempre"
                ? "Con la app cerrada es la forma de que te llegue al celu."
                : "Solo se usa en el modo \"Siempre\"."}
            </span>
          </span>
        </label>
      </>
    );
  }

  return (
    <div className="pila-chica">
      <h3 className="subtitulo">Avisos</h3>
      {avisosDispositivo}
      <h3 className="subtitulo" id="busqueda-personalizada" tabIndex={-1}>
        Búsqueda personalizada
      </h3>
      {reglas}
      {errorGuardar && (
        <p className="mensaje-error" role="alert">
          {errorGuardar}
        </p>
      )}
    </div>
  );
}

function ListaReglas({ titulo, ayuda, placeholder, tipo, sugeridos, lista, deshabilitado, onCambiar }) {
  const [nueva, setNueva] = useState("");
  const [error, setError] = useState("");

  async function agregar(e) {
    e.preventDefault();
    const valor = nueva.trim();
    if (!valor) {
      setError("Escribí algo para agregar.");
      return;
    }
    if (lista.some((x) => x.toLowerCase() === valor.toLowerCase())) {
      setError("Ya está en la lista.");
      return;
    }
    if (lista.length >= 20) {
      setError("Llegaste al máximo de 20.");
      return;
    }
    setError("");
    if (await onCambiar([...lista, valor], `"${valor}" agregado`)) setNueva("");
  }

  const tiene = (dominio) => lista.some((x) => x.toLowerCase() === dominio);
  function alternarSugerido({ nombre, dominios }) {
    if (dominios.every(tiene)) {
      onCambiar(
        lista.filter((x) => !dominios.includes(x.toLowerCase())),
        `${nombre} sacado`
      );
      return;
    }
    const nuevos = dominios.filter((d) => !tiene(d));
    if (lista.length + nuevos.length > 20) {
      setError("Llegaste al máximo de 20. Sacá alguno para sumar otro.");
      return;
    }
    setError("");
    onCambiar([...lista, ...nuevos], `${nombre} agregado`);
  }

  return (
    <fieldset className="field">
      <legend>{titulo}</legend>
      {sugeridos && (
        <div className="pila-chica">
          <p className="field-ayuda">Tocá los que usás:</p>
          <div className="chips">
            {sugeridos.map((s) => (
              <button
                key={s.nombre}
                type="button"
                className="chip"
                aria-pressed={s.dominios.every(tiene)}
                disabled={deshabilitado}
                onClick={() => alternarSugerido(s)}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
      )}
      {lista.length > 0 ? (
        <ul className="lista chips">
          {lista.map((r) => (
            <li key={r} className="tag tag-borrable">
              {r}
              <button
                type="button"
                className="btn btn-icono"
                disabled={deshabilitado}
                onClick={() => onCambiar(lista.filter((x) => x !== r), `"${r}" sacado`)}
                aria-label={`Sacar ${r}`}
              >
                <i className="ph ph-x" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mensaje-estado">Todavía no agregaste ninguno.</p>
      )}
      <form className="form-buscar" onSubmit={agregar} noValidate>
        <Campo etiqueta={`Agregar a "${titulo}"`} error={error}>
          {(p) => (
            <input
              {...p}
              className="input"
              type={tipo}
              autoComplete="off"
              placeholder={placeholder}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          )}
        </Campo>
        <button className="btn btn-secondary" type="submit" disabled={deshabilitado}>
          Agregar
        </button>
      </form>
      <p className="field-ayuda">{ayuda}</p>
    </fieldset>
  );
}

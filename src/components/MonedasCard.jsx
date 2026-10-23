import { useEffect, useRef, useState } from "react";
import { guardarMonedas } from "../api";
import { useAvisos } from "../avisos";
import { parseMonto } from "../format";
import {
  CODIGOS_EXTRA,
  fmtActualizada,
  fmtCotizacion,
  MONEDAS,
  nombreTipoDolar,
  TIPOS_DOLAR,
  valorAutomatico,
} from "../monedas";
import { playError, playSuccess } from "../sounds";
import Campo from "./Campo";
import { Cargando, ErrorEstado, Skeleton } from "./Estado";

// Pasa lo guardado a lo que edita el formulario (el valor fijo como texto).
function aBorrador(config) {
  return Object.fromEntries(
    CODIGOS_EXTRA.map((codigo) => {
      const c = config?.[codigo];
      const valor = Number(c?.valor) || 0;
      return [
        codigo,
        {
          activa: !!c,
          modo: c?.modo === "fijo" ? "fijo" : "auto",
          tipo: c?.tipo || "oficial",
          valorTexto: c?.modo === "fijo" && valor ? String(valor).replace(".", ",") : "",
          valorGuardado: valor,
          fecha: c?.fecha || "",
        },
      ];
    }),
  );
}

function errorValorFijo(item) {
  if (!item.activa || item.modo !== "fijo") return "";
  if (!item.valorTexto.trim()) return "Escribí cuántos pesos vale.";
  const v = parseMonto(item.valorTexto);
  return v > 0 ? "" : "Escribí solo números mayores a 0, por ejemplo 1500 o 1,55.";
}

export default function MonedasCard({ monedas, cotizacionesHoy, cuentas, onGuardadas }) {
  const { avisar } = useAvisos();
  const config = monedas.data?.monedas;
  const [borrador, setBorrador] = useState(() => aBorrador(config));
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardar, setErrorGuardar] = useState("");

  // Cuando llega (o cambia) lo guardado, el formulario arranca de ahí, salvo
  // que ya hayas empezado a tocar algo (no se pisa lo que estás editando).
  const sucio = useRef(false);
  useEffect(() => {
    if (!sucio.current) setBorrador(aBorrador(config));
  }, [config]);

  function cambiar(codigo, cambios) {
    sucio.current = true;
    setBorrador((b) => ({ ...b, [codigo]: { ...b[codigo], ...cambios } }));
  }

  // Cuentas que usan cada moneda: esa moneda no se puede sacar.
  const usadaPor = (codigo) => (cuentas || []).filter((c) => c.moneda === codigo).map((c) => c.nombre);

  async function guardar(e) {
    e.preventDefault();
    setIntentado(true);
    if (CODIGOS_EXTRA.some((codigo) => errorValorFijo(borrador[codigo]))) return;

    const nuevo = {};
    CODIGOS_EXTRA.forEach((codigo) => {
      const item = borrador[codigo];
      if (!item.activa) return;
      const entrada = { modo: item.modo };
      if (codigo === "USD") entrada.tipo = item.tipo;
      if (item.modo === "fijo") {
        entrada.valor = parseMonto(item.valorTexto);
      } else {
        const hoy = valorAutomatico(codigo, item, cotizacionesHoy.data);
        entrada.valor = hoy?.valor || item.valorGuardado || null;
        entrada.fecha = hoy?.fecha || item.fecha;
      }
      nuevo[codigo] = entrada;
    });

    setGuardando(true);
    setErrorGuardar("");
    try {
      await guardarMonedas(nuevo);
      sucio.current = false;
      playSuccess();
      avisar("Monedas guardadas");
      setIntentado(false);
      onGuardadas?.();
    } catch (err) {
      playError();
      setErrorGuardar(err.message || "No se pudieron guardar las monedas. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  let contenido;
  if (monedas.cargando) {
    contenido = (
      <Cargando texto="Cargando tus monedas…">
        <div className="pila-chica">
          <Skeleton ancho="60%" />
          <Skeleton ancho="45%" />
          <Skeleton ancho="55%" />
          <Skeleton variante="boton" />
        </div>
      </Cargando>
    );
  } else if (monedas.error && !monedas.data) {
    contenido = <ErrorEstado mensaje={monedas.error} onReintentar={monedas.recargar} />;
  } else if (monedas.data?.sinConfigurar) {
    contenido = (
      <p className="aviso-inline">
        <i className="ph ph-info" aria-hidden="true" />
        Esta sección todavía no está disponible en tu planilla. Mientras tanto el dólar se pasa a pesos a{" "}
        {fmtCotizacion(config?.USD?.valor)}.
      </p>
    );
  } else {
    contenido = (
      <form className="pila" onSubmit={guardar} noValidate>
        <ul className="lista monedas-lista">
          {CODIGOS_EXTRA.map((codigo) => {
            const m = MONEDAS[codigo];
            const item = borrador[codigo];
            const enUso = usadaPor(codigo);
            const bloqueada = item.activa && enUso.length > 0;
            const error = intentado ? errorValorFijo(item) : "";
            return (
              <li key={codigo} className="pila-chica">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={item.activa}
                    disabled={bloqueada}
                    onChange={(e) => cambiar(codigo, { activa: e.target.checked })}
                    aria-describedby={bloqueada ? `en-uso-${codigo}` : undefined}
                  />
                  <span>
                    <span className="negrita">
                      {m.plural} ({m.simbolo})
                    </span>
                    {bloqueada && (
                      <span className="check-ayuda texto-tenue" id={`en-uso-${codigo}`}>
                        La usa{enUso.length > 1 ? "n" : ""} {enUso.join(", ")}. Para sacarla, primero cambiá o borrá
                        esa{enUso.length > 1 ? "s" : ""} cuenta{enUso.length > 1 ? "s" : ""}.
                      </span>
                    )}
                  </span>
                </label>

                {item.activa && (
                  <div className="moneda-detalle pila-chica">
                    <fieldset className="field">
                      <legend>Cotización del {m.nombre.toLowerCase()}</legend>
                      <div className="seg">
                        {[
                          ["auto", "Automática"],
                          ["fijo", "Valor fijo"],
                        ].map(([valor, texto]) => (
                          <label className="seg-opt" key={valor}>
                            <input
                              type="radio"
                              name={`modo-${codigo}`}
                              checked={item.modo === valor}
                              onChange={() => cambiar(codigo, { modo: valor })}
                            />
                            {texto}
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {item.modo === "auto" ? (
                      <>
                        {codigo === "USD" && (
                          <Campo etiqueta="¿Qué dólar?">
                            {(p) => (
                              <select
                                {...p}
                                className="input"
                                value={item.tipo}
                                onChange={(e) => cambiar(codigo, { tipo: e.target.value })}
                              >
                                {TIPOS_DOLAR.map(([valor, texto]) => (
                                  <option key={valor} value={valor}>
                                    {texto}
                                  </option>
                                ))}
                              </select>
                            )}
                          </Campo>
                        )}
                        <ValorHoy codigo={codigo} item={item} cotizacionesHoy={cotizacionesHoy} />
                      </>
                    ) : (
                      <Campo
                        etiqueta={`Cuántos pesos vale 1 ${m.nombre.toLowerCase()}`}
                        ayuda="Se usa siempre este valor hasta que lo cambies."
                        error={error}
                      >
                        {(p) => (
                          <input
                            {...p}
                            className="input"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="Ej: 1500"
                            value={item.valorTexto}
                            onChange={(e) => cambiar(codigo, { valorTexto: e.target.value })}
                          />
                        )}
                      </Campo>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {errorGuardar && (
          <p className="mensaje-error" role="alert">
            {errorGuardar}
          </p>
        )}
        <button className="btn btn-primary btn-alinear-inicio" type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : errorGuardar ? "Reintentar" : "Guardar monedas"}
        </button>
      </form>
    );
  }

  return (
    <section className="card" aria-labelledby="titulo-monedas">
      <h2 className="card-kicker" id="titulo-monedas">
        Monedas
      </h2>
      <p className="texto-intro">
        Elegí qué monedas usás además del peso. Después vas a poder crear cuentas en esas monedas, y los totales las
        pasan a pesos.
      </p>
      {contenido}
    </section>
  );
}

// La cotización automática de hoy, con sus cuatro estados.
function ValorHoy({ codigo, item, cotizacionesHoy }) {
  const tipo = nombreTipoDolar(item.tipo);
  const nombre = codigo === "USD" ? `dólar ${tipo === "MEP" ? tipo : tipo.toLowerCase()}` : MONEDAS[codigo].nombre.toLowerCase();
  if (cotizacionesHoy.cargando) {
    return (
      <Cargando texto="Trayendo la cotización de hoy…">
        <Skeleton ancho="70%" />
      </Cargando>
    );
  }
  const hoy = valorAutomatico(codigo, item, cotizacionesHoy.data);
  if (hoy) {
    const cuando = fmtActualizada(hoy.fecha);
    const texto = `Hoy: 1 ${nombre} = ${fmtCotizacion(hoy.valor)}${cuando ? ` · actualizada ${cuando}` : ""}`;
    return (
      <p className="texto-chico texto-tenue" aria-live="polite">
        <i className="ph ph-arrows-clockwise" aria-hidden="true" /> {texto}
      </p>
    );
  }
  const guardado = item.valorGuardado ? ` Mientras tanto se usa la última que había: ${fmtCotizacion(item.valorGuardado)}.` : "";
  return (
    <div className="pila-chica" role="alert">
      <p className="aviso-inline">
        <i className="ph ph-warning-circle" aria-hidden="true" />
        <span>
          {cotizacionesHoy.error || `No encontré la cotización del ${nombre}.`}
          {guardado}
        </span>
      </p>
      <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={cotizacionesHoy.recargar}>
        <i className="ph ph-arrow-clockwise" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

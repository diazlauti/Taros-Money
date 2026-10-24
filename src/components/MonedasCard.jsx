import { useEffect, useRef, useState } from "react";
import { guardarMonedas } from "../api";
import { useAvisos } from "../avisos";
import { parseMonto } from "../format";
import {
  CODIGOS_EXTRA,
  errorCodigoPropio,
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

// Las monedas que agregó la persona, como lista editable.
function aPropias(config) {
  return Object.entries(config || {})
    .filter(([, c]) => c?.propia)
    .map(([codigo, c]) => ({
      codigo,
      nombre: c.nombre || codigo,
      simbolo: c.simbolo || "",
      decimales: Number(c.decimales) === 0 ? 0 : 2,
      valorTexto: Number(c.valor) ? String(c.valor).replace(".", ",") : "",
    }));
}

const NUEVA_VACIA = { codigo: "", nombre: "", simbolo: "", valorTexto: "" };

function erroresNueva(nueva, ocupados) {
  const errores = {
    codigo: errorCodigoPropio(nueva.codigo, ocupados),
    nombre: nueva.nombre.trim() ? "" : "Poné un nombre, por ejemplo «Peso uruguayo».",
    valor: errorValorFijo({ activa: true, modo: "fijo", valorTexto: nueva.valorTexto }),
  };
  return Object.values(errores).some(Boolean) ? errores : null;
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
  const [propias, setPropias] = useState(() => aPropias(config));
  const [nueva, setNueva] = useState(NUEVA_VACIA);
  const [agregando, setAgregando] = useState(false);
  const [intentoNueva, setIntentoNueva] = useState(false);

  // Cuando llega (o cambia) lo guardado, el formulario arranca de ahí, salvo
  // que ya hayas empezado a tocar algo (no se pisa lo que estás editando).
  const sucio = useRef(false);
  useEffect(() => {
    if (sucio.current) return;
    setBorrador(aBorrador(config));
    setPropias(aPropias(config));
  }, [config]);

  function cambiarPropia(codigo, cambios) {
    sucio.current = true;
    setPropias((lista) => lista.map((p) => (p.codigo === codigo ? { ...p, ...cambios } : p)));
  }

  function sacarPropia(codigo) {
    sucio.current = true;
    setPropias((lista) => lista.filter((p) => p.codigo !== codigo));
  }

  const erroresDeNueva = erroresNueva(nueva, propias.map((p) => p.codigo));

  function sumarNueva() {
    setIntentoNueva(true);
    if (erroresDeNueva) return;
    sucio.current = true;
    const codigo = nueva.codigo.trim().toUpperCase();
    setPropias((lista) => [
      ...lista,
      {
        codigo,
        nombre: nueva.nombre.trim(),
        simbolo: nueva.simbolo.trim() || codigo + "$",
        decimales: 2,
        valorTexto: nueva.valorTexto,
      },
    ]);
    setNueva(NUEVA_VACIA);
    setIntentoNueva(false);
    setAgregando(false);
    avisar(`${nueva.nombre.trim()} agregada. Tocá «Guardar monedas» para que quede.`);
  }

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
    if (propias.some((p) => errorValorFijo({ activa: true, modo: "fijo", valorTexto: p.valorTexto }))) return;

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
    propias.forEach((p) => {
      nuevo[p.codigo] = {
        modo: "fijo",
        valor: parseMonto(p.valorTexto),
        propia: true,
        nombre: p.nombre,
        simbolo: p.simbolo,
        decimales: p.decimales,
      };
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

        <div className="pila-chica" aria-labelledby="titulo-monedas-propias" role="group">
          <h3 className="subtitulo" id="titulo-monedas-propias">
            Tus monedas
          </h3>
          <p className="texto-chico texto-tenue">
            ¿Usás otra moneda (peso uruguayo, guaraní, una cripto)? Agregala con tu propia cotización.
          </p>
          {propias.length > 0 && (
            <ul className="lista monedas-lista">
              {propias.map((p) => {
                const enUso = usadaPor(p.codigo);
                const error = intentado ? errorValorFijo({ activa: true, modo: "fijo", valorTexto: p.valorTexto }) : "";
                return (
                  <li key={p.codigo} className="pila-chica">
                    <div className="fila-separada">
                      <span className="negrita">
                        <i className="ph ph-coins" aria-hidden="true" /> {p.nombre} ({p.simbolo})
                      </span>
                      <button
                        type="button"
                        className="btn btn-icono"
                        onClick={() => sacarPropia(p.codigo)}
                        disabled={enUso.length > 0}
                        aria-label={`Sacar ${p.nombre}`}
                        aria-describedby={enUso.length ? `en-uso-${p.codigo}` : undefined}
                      >
                        <i className="ph ph-trash" aria-hidden="true" />
                      </button>
                    </div>
                    {enUso.length > 0 && (
                      <span className="texto-chico texto-tenue" id={`en-uso-${p.codigo}`}>
                        La usa{enUso.length > 1 ? "n" : ""} {enUso.join(", ")}: para sacarla, primero cambiá o borrá
                        esa{enUso.length > 1 ? "s" : ""} cuenta{enUso.length > 1 ? "s" : ""}.
                      </span>
                    )}
                    <Campo etiqueta={`Cuántos pesos vale 1 ${p.codigo}`} error={error}>
                      {(props) => (
                        <input
                          {...props}
                          className="input"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={p.valorTexto}
                          onChange={(e) => cambiarPropia(p.codigo, { valorTexto: e.target.value })}
                        />
                      )}
                    </Campo>
                  </li>
                );
              })}
            </ul>
          )}

          {agregando ? (
            <div className="moneda-detalle pila-chica">
              <Campo etiqueta="Código" ayuda="3 o 4 letras. Ej: UYU" error={intentoNueva ? erroresDeNueva?.codigo : ""}>
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={4}
                    placeholder="UYU"
                    value={nueva.codigo}
                    onChange={(e) => setNueva((n) => ({ ...n, codigo: e.target.value.toUpperCase() }))}
                    data-autofocus
                  />
                )}
              </Campo>
              <Campo etiqueta="Nombre" error={intentoNueva ? erroresDeNueva?.nombre : ""}>
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    type="text"
                    autoComplete="off"
                    maxLength={30}
                    placeholder="Peso uruguayo"
                    value={nueva.nombre}
                    onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
                  />
                )}
              </Campo>
              <Campo etiqueta="Símbolo (opcional)" ayuda="Cómo se ve delante del monto. Ej: $U">
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    type="text"
                    autoComplete="off"
                    maxLength={5}
                    placeholder={(nueva.codigo || "UYU") + "$"}
                    value={nueva.simbolo}
                    onChange={(e) => setNueva((n) => ({ ...n, simbolo: e.target.value }))}
                  />
                )}
              </Campo>
              <Campo
                etiqueta="Cuántos pesos vale 1"
                ayuda="Tu cotización. La podés cambiar cuando quieras."
                error={intentoNueva ? erroresDeNueva?.valor : ""}
              >
                {(p) => (
                  <input
                    {...p}
                    className="input"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="Ej: 30"
                    value={nueva.valorTexto}
                    onChange={(e) => setNueva((n) => ({ ...n, valorTexto: e.target.value }))}
                  />
                )}
              </Campo>
              <div className="fila">
                <button type="button" className="btn btn-secondary" onClick={sumarNueva}>
                  <i className="ph ph-plus" aria-hidden="true" />
                  Agregar a la lista
                </button>
                <button
                  type="button"
                  className="btn btn-texto"
                  onClick={() => {
                    setAgregando(false);
                    setNueva(NUEVA_VACIA);
                    setIntentoNueva(false);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={() => setAgregando(true)}>
              <i className="ph ph-plus" aria-hidden="true" />
              Agregar otra moneda
            </button>
          )}
        </div>

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

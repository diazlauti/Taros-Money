import { useEffect, useMemo, useState } from "react";
import { calcularImpuestos, guardarAjustesCalculadora, leerAjustesCalculadora, MAX_IMPUESTOS } from "../calculadora";
import { fmtMoney, parseMonto } from "../format";
import { fmtCotizacion, infoMoneda, valorAutomatico } from "../monedas";
import Campo from "./Campo";
import Explicacion from "./Explicacion";

// "1565" → "1565"; 1549.2 → "1549,2" (como se escribe acá).
function aTexto(n) {
  return n ? String(Math.round(n * 100) / 100).replace(".", ",") : "";
}

// Sección «Calculadora» del menú. Cuánto termina saliendo en pesos algo que se paga en otra moneda (o con
// impuestos encima). Los porcentajes se editan y quedan guardados en este
// dispositivo.
export default function CalculadoraTab({ cotizaciones, configMonedas, cotizacionesHoy, onCargarGasto }) {
  const [ajustes, setAjustes] = useState(leerAjustesCalculadora);
  const [montoTexto, setMontoTexto] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState("");
  const [errorNuevo, setErrorNuevo] = useState("");

  // Monedas para elegir: el dólar siempre, las que tenés activas y pesos.
  const opciones = useMemo(() => {
    const codigos = ["USD", ...Object.keys(configMonedas || {}).filter((c) => c !== "USD")];
    return [...codigos.map((c) => [c, `${infoMoneda(c)?.plural || c} (${c})`]), ["ARS", "Pesos (ARS)"]];
  }, [configMonedas]);
  const moneda = opciones.some(([c]) => c === ajustes.moneda) ? ajustes.moneda : "USD";

  // Para compras con tarjeta se toma el dólar oficial (sobre ese se cobran
  // los impuestos); si no llegó, la cotización que usás en la app.
  const sugerida = useMemo(() => {
    if (moneda === "ARS") return { valor: 1, texto: "" };
    if (moneda === "USD") {
      const oficial = valorAutomatico("USD", { tipo: "oficial" }, cotizacionesHoy?.data);
      if (oficial) return { valor: oficial.valor, texto: "Dólar oficial de hoy" };
    }
    const tuya = cotizaciones?.[moneda];
    return tuya ? { valor: tuya, texto: "La cotización que usás en la app" } : { valor: 0, texto: "" };
  }, [moneda, cotizaciones, cotizacionesHoy?.data]);

  // null = usar la sugerida (y seguirla si llega después); si escribís, queda la tuya.
  const [cotizacionPropia, setCotizacionPropia] = useState(null);
  const cotizacionTexto = cotizacionPropia ?? aTexto(sugerida.valor);

  useEffect(() => {
    guardarAjustesCalculadora(ajustes);
  }, [ajustes]);

  const monto = parseMonto(montoTexto);
  const cotizacion = moneda === "ARS" ? 1 : parseMonto(cotizacionTexto);
  const errorMonto = !montoTexto.trim() ? "Escribí cuánto cuesta." : monto > 0 ? "" : "Escribí solo números, por ejemplo 9,99.";
  const errorCotizacion = moneda === "ARS" || cotizacion > 0 ? "" : "Escribí cuántos pesos vale 1, por ejemplo 1500.";
  const listo = !errorMonto && !errorCotizacion;
  const resultado = listo ? calcularImpuestos(monto, cotizacion, ajustes.impuestos) : null;

  function cambiarImpuesto(id, cambios) {
    setAjustes((a) => ({ ...a, impuestos: a.impuestos.map((i) => (i.id === id ? { ...i, ...cambios } : i)) }));
  }

  function sacarImpuesto(id) {
    setAjustes((a) => ({ ...a, impuestos: a.impuestos.filter((i) => i.id !== id) }));
  }

  function sumarImpuesto() {
    const nombre = nuevoNombre.trim();
    const porcentaje = parseMonto(nuevoPorcentaje);
    if (!nombre) return setErrorNuevo("Poné un nombre, por ejemplo «Sellos».");
    if (!(porcentaje > 0 && porcentaje <= 200)) return setErrorNuevo("El porcentaje tiene que ser un número entre 0 y 200.");
    setAjustes((a) => ({
      ...a,
      impuestos: [...a.impuestos, { id: `propio-${Date.now()}`, nombre, porcentaje, activo: true, propio: true }],
    }));
    setNuevoNombre("");
    setNuevoPorcentaje("");
    setErrorNuevo("");
  }

  function cargar() {
    setIntentado(true);
    if (!resultado) return;
    const simbolo = infoMoneda(moneda)?.simbolo || "$";
    onCargarGasto({
      tipo: "gasto",
      monto: String(Math.round(resultado.total)),
      descripcion: moneda === "ARS" ? "Compra con impuestos" : `Compra de ${simbolo}${montoTexto.trim()} con impuestos`,
      categoria: "",
    });
  }

  return (
    <section className="card calc-card" aria-labelledby="titulo-calculadora">
      {/* En compu: los datos a la izquierda y el resultado a la derecha. */}
      <div className="calc-columnas">
        <div className="pila">
          <h2 className="visualmente-oculto" id="titulo-calculadora">
            Calculadora de impuestos
          </h2>

          <div className="fila-campos">
            <Campo
              etiqueta="Precio"
              explicacion="¿Cuánto te sale en pesos algo que pagás en dólares, con todos los impuestos? Elegí qué se cobra y cuánto."
              error={intentado ? errorMonto : ""}
            >
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej: 9,99"
                  value={montoTexto}
                  onChange={(e) => setMontoTexto(e.target.value)}
                />
              )}
            </Campo>
            <Campo etiqueta="Moneda">
              {(p) => (
                <select
                  {...p}
                  className="input"
                  value={moneda}
                  onChange={(e) => {
                    setCotizacionPropia(null);
                    setAjustes((a) => ({ ...a, moneda: e.target.value }));
                  }}
                >
                  {opciones.map(([c, texto]) => (
                    <option key={c} value={c}>
                      {texto}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>

          {moneda !== "ARS" && (
            <Campo
              etiqueta={`Cuántos pesos vale 1 ${moneda}`}
              explicacion={
                cotizacionesHoy?.cargando && moneda === "USD"
                  ? "Trayendo la cotización de hoy…"
                  : sugerida.texto
                    ? `${sugerida.texto}: ${fmtCotizacion(sugerida.valor)}. Podés poner otra.`
                    : "Poné la cotización que te cobran."
              }
              error={intentado || cotizacionTexto ? errorCotizacion : ""}
            >
              {(p) => (
                <input
                  {...p}
                  className="input"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej: 1500"
                  value={cotizacionTexto}
                  onChange={(e) => setCotizacionPropia(e.target.value)}
                />
              )}
            </Campo>
          )}

          <fieldset className="field">
            <legend>Impuestos</legend>
            <ul className="lista calc-impuestos">
              {ajustes.impuestos.map((imp) => (
                <li key={imp.id} className="calc-impuesto">
                  <span className="calc-impuesto-nombre">
                    <label className="check">
                      <input type="checkbox" checked={imp.activo} onChange={(e) => cambiarImpuesto(imp.id, { activo: e.target.checked })} />
                      <span className="negrita">{imp.nombre}</span>
                    </label>
                    {imp.ayuda && <Explicacion texto={imp.ayuda} etiqueta={`Qué es ${imp.nombre}`} />}
                  </span>
                  <div className="calc-porcentaje">
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-label={`Porcentaje de ${imp.nombre}`}
                      value={String(imp.porcentaje).replace(".", ",")}
                      onChange={(e) => {
                        const v = parseMonto(e.target.value);
                        cambiarImpuesto(imp.id, { porcentaje: e.target.value === "" ? 0 : v >= 0 && v <= 200 ? v : imp.porcentaje });
                      }}
                    />
                    <span aria-hidden="true">%</span>
                    {imp.propio && (
                      <button type="button" className="btn btn-icono" onClick={() => sacarImpuesto(imp.id)} aria-label={`Sacar ${imp.nombre}`}>
                        <i className="ph ph-trash" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

          {ajustes.impuestos.length < MAX_IMPUESTOS && (
            <details className="calc-otro">
              <summary>Sumar otro impuesto</summary>
              <div className="fila-campos">
                <Campo etiqueta="Nombre" error={errorNuevo}>
                  {(p) => (
                    <input
                      {...p}
                      className="input"
                      type="text"
                      autoComplete="off"
                      maxLength={40}
                      placeholder="Ej: Sellos"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                    />
                  )}
                </Campo>
                <Campo etiqueta="%">
                  {(p) => (
                    <input
                      {...p}
                      className="input"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="Ej: 1,2"
                      value={nuevoPorcentaje}
                      onChange={(e) => setNuevoPorcentaje(e.target.value)}
                    />
                  )}
                </Campo>
              </div>
              <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={sumarImpuesto}>
                <i className="ph ph-plus" aria-hidden="true" />
                Sumar
              </button>
            </details>
          )}

        </div>

        <div className="pila calc-lado">
          <div aria-live="polite">
            {resultado && (
              <div className="calc-resultado">
                <div className="fila-separada">
                  <span>Precio en pesos</span>
                  <span>{fmtMoney(resultado.base)}</span>
                </div>
                {resultado.detalle.map((d) => (
                  <div className="fila-separada texto-tenue" key={d.id}>
                    <span>
                      + {d.nombre} ({String(d.porcentaje).replace(".", ",")}%)
                    </span>
                    <span>{fmtMoney(d.monto)}</span>
                  </div>
                ))}
                <div className="fila-separada calc-total">
                  <span className="titulo-con-info">
                    Total
                    <Explicacion
                      texto="Es una cuenta aproximada: los impuestos cambian seguido, revisalos en el resumen de tu tarjeta."
                      etiqueta="Más info sobre el total"
                    />
                  </span>
                  <span>{fmtMoney(resultado.total)}</span>
                </div>
              </div>
            )}
          </div>

          {resultado && (
            <button type="button" className="btn btn-primary btn-alinear-inicio" onClick={cargar}>
              <i className="ph ph-plus" aria-hidden="true" />
              Cargar como gasto
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

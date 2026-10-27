import { useRef, useState } from "react";
import { ajustarCuenta, crearCuenta } from "../api";
import { avisarAccionTour } from "../tour";
import { useAvisos } from "../avisos";
import { fmtMoney, parseMonto } from "../format";
import { etiquetaMoneda } from "../monedas";
import { useValidacion } from "../hooks";
import { playError, playSuccess } from "../sounds";
import { errorNombreNuevo } from "../validaciones";
import Campo from "./Campo";
import EditarCuentaDialog from "./EditarCuentaDialog";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";
import MontoDialog from "./MontoDialog";

const VACIO = { nombre: "", saldo: "", moneda: "ARS" };

export default function CuentasTab({ cuentas, monedasActivas = [], onCambio, onCambioGeneral, onIrAMonedas }) {
  const { avisar } = useAvisos();
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState("");
  const [ajustando, setAjustando] = useState(null);
  const [editando, setEditando] = useState(null);
  const nombreRef = useRef(null);
  const lista = cuentas.data || [];
  const v = useValidacion(form, (f) => ({
    nombre: errorNombreNuevo(f.nombre, lista.map((c) => c.nombre), "cuenta"),
    saldo: f.saldo.trim() && !(parseMonto(f.saldo) >= 0) ? "Escribí solo números, por ejemplo 15000 o 15000,50." : "",
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
      await crearCuenta({ nombre: form.nombre.trim(), saldo: parseMonto(form.saldo) || 0, moneda: form.moneda });
      playSuccess();
      avisar("Cuenta agregada");
      avisarAccionTour("cuenta-creada");
      setForm(VACIO);
      v.reiniciar();
      onCambio?.();
    } catch (err) {
      playError();
      setErrorForm(err.message || "No se pudo crear la cuenta. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Para corregir el saldo de una cuenta ya creada: sumar o restar, nunca
  // "recrearla" con el mismo nombre (el backend ahora rechaza eso a propósito,
  // porque antes pisaba el saldo viejo sin avisar).
  async function ajustar(delta) {
    try {
      await ajustarCuenta(ajustando.nombre, delta);
    } catch (err) {
      playError();
      throw err;
    }
    playSuccess();
    avisar("Saldo actualizado");
    onCambio?.();
  }

  let contenido;
  if (cuentas.cargando) {
    contenido = (
      <Cargando texto="Cargando cuentas…">
        <div className="grid-cards">
          {[0, 1, 2].map((i) => (
            <div className="card" key={i}>
              <Skeleton ancho="50%" />
              <Skeleton variante="monto-medio" />
              <Skeleton variante="boton" />
            </div>
          ))}
        </div>
      </Cargando>
    );
  } else if (cuentas.error && !cuentas.data) {
    contenido = (
      <div className="card">
        <ErrorEstado mensaje={cuentas.error} onReintentar={cuentas.recargar} />
      </div>
    );
  } else if (lista.length === 0) {
    contenido = (
      <div className="card">
        <Vacio icono="ph ph-wallet" texto="Todavía no cargaste ninguna cuenta. Empezá con la que más usás (efectivo, banco, Mercado Pago).">
          <button type="button" className="btn btn-secondary" onClick={() => nombreRef.current?.focus()}>
            <i className="ph ph-plus" aria-hidden="true" />
            Agregar cuenta
          </button>
        </Vacio>
      </div>
    );
  } else {
    contenido = (
      <ul className="lista grid-cards">
        {lista.map((c) => (
          <li className="card" key={c.nombre}>
            <div className="fila-separada">
              <h2 className="card-title">{c.nombre}</h2>
              {!c.esTarjeta && (
                <button type="button" className="btn btn-icono" onClick={() => setEditando(c)} aria-label={`Renombrar o borrar ${c.nombre}`}>
                  <i className="ph ph-pencil-simple" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="monto-medio">{fmtMoney(c.saldo, c.moneda)}</div>
            {c.esTarjeta ? (
              <span className="texto-tenue texto-chico">Se actualiza sola con los mails del banco</span>
            ) : (
              <button type="button" className="btn btn-secondary btn-alinear-inicio" onClick={() => setAjustando(c)}>
                <i className="ph ph-plus-minus" aria-hidden="true" />
                Ajustar saldo
              </button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="con-panel">
      <div className="con-panel-principal">{contenido}</div>

      <form
        className="card form ancho-form"
        onSubmit={agregar}
        noValidate
        aria-labelledby="titulo-nueva-cuenta"
        data-tour="nueva-cuenta"
      >
        <h2 className="card-kicker" id="titulo-nueva-cuenta">
          Agregar cuenta
        </h2>
        <Campo etiqueta="Nombre" error={v.visible("nombre")}>
          {(p) => (
            <input
              {...p}
              ref={nombreRef}
              className="input"
              value={form.nombre}
              onChange={(e) => campo("nombre", e.target.value)}
              onBlur={() => v.tocar("nombre")}
              placeholder="Ej: Banco"
            />
          )}
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Saldo actual" ayuda="Si lo dejás vacío, arranca en 0" error={v.visible("saldo")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={form.saldo}
                onChange={(e) => campo("saldo", e.target.value)}
                placeholder="0"
              />
            )}
          </Campo>
          <Campo etiqueta="Moneda">
            {(p) => (
              <select {...p} className="input" value={form.moneda} onChange={(e) => campo("moneda", e.target.value)}>
                {["ARS", ...monedasActivas].map((m) => (
                  <option key={m} value={m}>
                    {etiquetaMoneda(m)}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        {onIrAMonedas && (
          <button type="button" className="btn btn-texto btn-alinear-inicio" onClick={onIrAMonedas}>
            <i className="ph ph-currency-circle-dollar" aria-hidden="true" />
            ¿Otra moneda? Sumala en Configuración
          </button>
        )}
        {errorForm && (
          <p className="mensaje-error" role="alert">
            {errorForm}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : errorForm ? "Reintentar" : "Agregar"}
        </button>
      </form>

      {editando && (
        <EditarCuentaDialog
          cuenta={editando}
          otrosNombres={lista.filter((c) => c.nombre !== editando.nombre).map((c) => c.nombre)}
          onClose={() => setEditando(null)}
          onGuardado={onCambioGeneral}
        />
      )}

      {ajustando && (
        <MontoDialog
          titulo={`Ajustar saldo de ${ajustando.nombre}`}
          etiqueta={`Monto (${ajustando.moneda || "ARS"})`}
          ayuda={`Saldo actual: ${fmtMoney(ajustando.saldo, ajustando.moneda)}`}
          conSigno
          textoBoton="Guardar"
          onConfirmar={ajustar}
          onClose={() => setAjustando(null)}
        />
      )}
    </div>
  );
}

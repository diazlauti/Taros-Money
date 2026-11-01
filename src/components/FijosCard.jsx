import { useState } from "react";
import { guardarFijos } from "../api";
import { useAvisos } from "../avisos";
import { useConfirmar } from "../confirmar";
import { fmtMoney, parseMonto } from "../format";
import { idDeFijo, MAXIMO_FIJOS, mesDeInicio, validarFijo } from "../fijos";
import { useValidacion } from "../hooks";
import { playBorrar, playClick, playError, playSuccess } from "../sounds";
import { errorMonto } from "../validaciones";
import Campo from "./Campo";
import CategoriaChips from "./CategoriaChips";
import Dialog from "./Dialog";
import Explicacion from "./Explicacion";
import { Cargando, ErrorEstado, Skeleton, Vacio } from "./Estado";
import MensajeError from "./MensajeError";

const VACIO = { tipo: "gasto", nombre: "", monto: "", dia: "", categoria: "", cuenta: "" };

// Configuración › Gastos › «Se cargan solos»: el sueldo, el alquiler… se
// definen una vez y la app los anota sola el día que toca (ver fijos.js).
export default function FijosCard({ fijos, cuentas, categorias, onGuardado }) {
  const [dialogo, setDialogo] = useState(null);
  const lista = fijos.data?.fijos || [];

  let contenido;
  if (fijos.cargando) {
    contenido = (
      <Cargando texto="Cargando tus movimientos fijos…">
        <Skeleton ancho="70%" />
        <Skeleton ancho="50%" />
      </Cargando>
    );
  } else if (fijos.error && !fijos.data) {
    contenido = <ErrorEstado mensaje={fijos.error} onReintentar={fijos.recargar} />;
  } else {
    contenido = (
      <>
        {lista.length === 0 ? (
          <Vacio icono="ph ph-arrows-clockwise" texto="Nada por acá. Agregá tu sueldo o el alquiler y se anotan solos todos los meses." />
        ) : (
          <ul className="opciones">
            {lista.map((f) => (
              <li key={f.id}>
                <button type="button" className="opcion" onClick={() => setDialogo(f)}>
                  <i
                    className={`ph ${f.tipo === "ingreso" ? "ph-arrow-down-left" : "ph-arrow-up-right"} opcion-icono`}
                    aria-hidden="true"
                  />
                  <span className="opcion-texto">
                    {f.nombre} · el {f.dia}
                    {f.activo === false ? " · en pausa" : ""}
                  </span>
                  <span className="monto-chico">{fmtMoney(f.monto)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {fijos.data?.soloEsteDispositivo && lista.length > 0 && (
          <p className="aviso-inline">
            <i className="ph ph-info" aria-hidden="true" />
            Por ahora se guardan solo en este dispositivo.
          </p>
        )}
        <div className="fila">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={lista.length >= MAXIMO_FIJOS}
            onClick={() => {
              playClick();
              setDialogo("nuevo");
            }}
          >
            <i className="ph ph-plus" aria-hidden="true" />
            Agregar
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="card" id="fijos" aria-labelledby="titulo-fijos">
      <h2 className="card-kicker titulo-con-info" id="titulo-fijos">
        Se cargan solos
        <Explicacion
          texto="Sueldo, alquiler, cuota del gimnasio… Los definís una vez y la app los anota sola el día que toca, una vez por mes. Los ves en Movimientos y los podés editar o borrar como cualquier otro."
          etiqueta="Más info sobre los movimientos que se cargan solos"
        />
      </h2>
      <div className="pila-chica" aria-live="polite">
        {contenido}
      </div>
      {dialogo && (
        <FijoDialog
          fijo={dialogo === "nuevo" ? null : dialogo}
          lista={lista}
          cuentas={cuentas}
          categorias={categorias}
          onClose={() => setDialogo(null)}
          onGuardado={onGuardado}
        />
      )}
    </section>
  );
}

function FijoDialog({ fijo, lista, cuentas, categorias, onClose, onGuardado }) {
  const { avisar } = useAvisos();
  const confirmar = useConfirmar();
  const inicial = fijo
    ? {
        tipo: fijo.tipo,
        nombre: fijo.nombre,
        monto: String(fijo.monto).replace(".", ","),
        dia: String(fijo.dia),
        categoria: fijo.categoria || "",
        cuenta: fijo.cuenta || "",
      }
    : { ...VACIO, cuenta: cuentas?.length === 1 ? cuentas[0].nombre : "" };
  const [form, setForm] = useState(inicial);
  const [activo, setActivo] = useState(fijo ? fijo.activo !== false : true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const v = useValidacion(form, (f) => validarFijo(f, errorMonto));

  function campo(nombre, valor) {
    setForm((f) => ({ ...f, [nombre]: valor }));
  }

  async function guardarLista(nueva, mensaje, sonido) {
    setEnviando(true);
    setError("");
    try {
      await guardarFijos(nueva);
      sonido();
      avisar(mensaje);
      onGuardado?.();
      onClose();
    } catch (err) {
      playError();
      setError(err.message || "No se pudo guardar. Probá de nuevo.");
      setEnviando(false);
    }
  }

  function guardar(e) {
    e.preventDefault();
    if (!v.intentar()) return;
    if (!form.cuenta) {
      setError("Elegí en qué cuenta se anota.");
      return;
    }
    const dia = Number(form.dia);
    const nuevo = {
      id: fijo?.id || idDeFijo(),
      tipo: form.tipo,
      nombre: form.nombre.trim(),
      monto: parseMonto(form.monto),
      dia,
      categoria: form.categoria,
      cuenta: form.cuenta,
      activo,
      // Si cambia el día, vuelve a arrancar desde el próximo que toque.
      desde: fijo && Number(fijo.dia) === dia && fijo.desde ? fijo.desde : mesDeInicio(dia),
    };
    const nueva = fijo ? lista.map((f) => (f.id === fijo.id ? nuevo : f)) : [...lista, nuevo];
    guardarLista(nueva, fijo ? "Cambios guardados" : "Listo: se va a cargar solo", playSuccess);
  }

  async function borrar() {
    const ok = await confirmar({
      titulo: `¿Borrar «${fijo.nombre}»?`,
      texto: "Deja de cargarse solo. Lo que ya se cargó queda en Movimientos.",
      si: "Borrar",
      peligro: true,
    });
    if (ok) guardarLista(lista.filter((f) => f.id !== fijo.id), "Fijo borrado", playBorrar);
  }

  const sucio = Object.keys(inicial).some((k) => inicial[k] !== form[k]) || activo !== (fijo ? fijo.activo !== false : true);

  return (
    <Dialog titulo={fijo ? "Editar fijo" : "Nuevo fijo"} onClose={onClose} sucio={sucio && !enviando}>
      <form className="form" onSubmit={guardar} noValidate>
        <fieldset className="field">
          <legend>Tipo</legend>
          <div className="chips">
            {[
              ["gasto", "Gasto"],
              ["ingreso", "Ingreso"],
            ].map(([valor, texto]) => (
              <label className="chip-radio" key={valor}>
                <input type="radio" name="tipo-fijo" value={valor} checked={form.tipo === valor} onChange={() => campo("tipo", valor)} />
                {texto}
              </label>
            ))}
          </div>
        </fieldset>
        <Campo etiqueta="Nombre" error={v.visible("nombre")}>
          {(p) => (
            <input
              {...p}
              className="input"
              type="text"
              data-autofocus
              placeholder={form.tipo === "ingreso" ? "Ej: Sueldo" : "Ej: Alquiler"}
              value={form.nombre}
              onChange={(e) => campo("nombre", e.target.value)}
              onBlur={() => v.tocar("nombre")}
            />
          )}
        </Campo>
        <div className="fila-2">
          <Campo etiqueta="Monto" error={v.visible("monto")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={form.monto}
                onChange={(e) => campo("monto", e.target.value)}
                onBlur={() => v.tocar("monto")}
              />
            )}
          </Campo>
          <Campo etiqueta="Día del mes" error={v.visible("dia")}>
            {(p) => (
              <input
                {...p}
                className="input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ej: 5"
                value={form.dia}
                onChange={(e) => campo("dia", e.target.value)}
                onBlur={() => v.tocar("dia")}
              />
            )}
          </Campo>
        </div>
        <CategoriaChips categorias={categorias} valor={form.categoria} onChange={(c) => campo("categoria", c)} />
        <Campo etiqueta="Cuenta">
          {(p) => (
            <select {...p} className="input" value={form.cuenta} onChange={(e) => campo("cuenta", e.target.value)}>
              <option value="">Elegí una cuenta</option>
              {(cuentas || []).map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre} ({c.moneda})
                </option>
              ))}
            </select>
          )}
        </Campo>
        {fijo && (
          <label className="chip-radio">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
            Cargar solo todos los meses
          </label>
        )}
        <p className="field-ayuda">
          {!fijo && form.dia && Number(form.dia) < new Date().getDate()
            ? "Empieza el mes que viene."
            : "Si el día es el 29, 30 o 31, en los meses más cortos se carga el último día."}
        </p>

        {error && <MensajeError>{error}</MensajeError>}

        <div className={`dialog-actions${fijo ? " dialog-actions--separadas" : ""}`}>
          {fijo && (
            <button type="button" className="btn btn-secondary btn-peligro" onClick={borrar} disabled={enviando}>
              <i className="ph ph-trash" aria-hidden="true" />
              Borrar
            </button>
          )}
          <div className="fila">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

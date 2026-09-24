import { useCallback, useEffect, useState } from "react";
import { getCategorias, getGastos, getResumen, getSaldo } from "./api";
import Saldo from "./components/Saldo";
import ResumenCategorias from "./components/ResumenCategorias";
import ListaGastos from "./components/ListaGastos";
import FormularioGasto from "./components/FormularioGasto";

const PERIODOS = [7, 14, 30, 90];

export default function App() {
  const [pestania, setPestania] = useState("resumen");
  const [dias, setDias] = useState(30);

  const [saldo, setSaldo] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [saldoData, resumenData, gastosData, categoriasData] = await Promise.all([
        getSaldo(),
        getResumen(dias),
        getGastos(dias),
        getCategorias(),
      ]);
      setSaldo(saldoData);
      setResumen(resumenData);
      setGastos(gastosData);
      setCategorias(categoriasData);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  }, [dias]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Taros Money</h1>
        <button className="boton-refrescar" onClick={cargarDatos} disabled={cargando}>
          ↻
        </button>
      </header>

      <Saldo saldo={saldo} cargando={cargando} />

      <nav className="tabs">
        <button
          className={pestania === "resumen" ? "tab tab--activa" : "tab"}
          onClick={() => setPestania("resumen")}
        >
          Resumen
        </button>
        <button
          className={pestania === "cargar" ? "tab tab--activa" : "tab"}
          onClick={() => setPestania("cargar")}
        >
          Cargar gasto
        </button>
      </nav>

      {error && <p className="mensaje-error">{error}</p>}

      {pestania === "resumen" && (
        <section>
          <div className="selector-periodo">
            {PERIODOS.map((p) => (
              <button
                key={p}
                className={dias === p ? "chip chip--activo" : "chip"}
                onClick={() => setDias(p)}
              >
                {p}d
              </button>
            ))}
          </div>

          <ResumenCategorias resumen={resumen} cargando={cargando} />

          <h2 className="subtitulo">Últimos gastos</h2>
          <ListaGastos gastos={gastos} cargando={cargando} />
        </section>
      )}

      {pestania === "cargar" && (
        <section>
          <FormularioGasto categorias={categorias} onGastoAgregado={cargarDatos} />
        </section>
      )}
    </div>
  );
}

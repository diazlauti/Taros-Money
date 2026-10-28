import { useEffect, useState } from "react";
import { escucharAvisosDeError } from "../reportarError";
import SugerenciaDialog from "./SugerenciaDialog";

// Abre el formulario de sugerencias cuando alguien toca «Avisar del error»
// en cualquier cartel de error. Va al final del panel para quedar encima de
// otros diálogos abiertos (ej. un formulario que falló al guardar).
export default function ReporteErrores({ pantalla }) {
  const [errorVisto, setErrorVisto] = useState(null);

  useEffect(() => escucharAvisosDeError((texto) => setErrorVisto(texto)), []);

  if (errorVisto === null) return null;
  return <SugerenciaDialog errorVisto={errorVisto} pantalla={pantalla} onClose={() => setErrorVisto(null)} />;
}

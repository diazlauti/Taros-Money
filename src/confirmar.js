import { createContext, useContext } from "react";

// Pregunta "¿Seguro?" con un cartel de la app (en vez del confirm del
// navegador). Devuelve una promesa con true o false. El proveedor está en
// components/Confirmar.jsx.
export const ConfirmarContext = createContext(async () => true);

export function useConfirmar() {
  return useContext(ConfirmarContext);
}

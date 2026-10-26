import { createContext, useContext } from "react";

// Pregunta "¿Seguro?" con un cartel de la app (en vez del confirm del
// navegador). Devuelve una promesa con true o false. El proveedor está en
// components/Confirmar.jsx.
// Sin proveedor (no debería pasar) cae en el confirm del navegador, así
// nunca se pierde lo cargado sin preguntar.
export const ConfirmarContext = createContext(async ({ titulo, texto }) => window.confirm([titulo, texto].filter(Boolean).join("\n")));

export function useConfirmar() {
  return useContext(ConfirmarContext);
}

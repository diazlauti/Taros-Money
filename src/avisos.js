import { createContext, useContext } from "react";

// Avisos cortos ("Gasto guardado") que se anuncian por aria-live. El
// proveedor está en components/Avisos.jsx.
export const AvisosContext = createContext({ avisar: () => {} });

export function useAvisos() {
return useContext(AvisosContext);
}

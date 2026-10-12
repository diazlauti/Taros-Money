// Recuerda si ya se vio el recorrido de primera vez (ver components/Tour.jsx).

const STORAGE_KEY = "taros-tour-visto";

export function tourVisto() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true; // sin storage no se puede recordar: mejor no mostrarlo cada vez
  }
}

export function marcarTourVisto() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* modo privado o storage bloqueado */
  }
}

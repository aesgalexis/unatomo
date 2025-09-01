// js/analytics.js

// Fallback 100% local (no requiere backend)
// Guarda un contador en localStorage para que la UI no se rompa.

const LS_KEY = "global-export-count-fallback";

export async function getGlobalExportCount() {
  try {
    const n = Number(localStorage.getItem(LS_KEY) || "0");
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function incrementGlobalExportCounter() {
  try {
    const curr = await getGlobalExportCount();
    const next = curr + 1;
    localStorage.setItem(LS_KEY, String(next));
    return next; // devolvemos el total actualizado
  } catch {
    return null;
  }
}

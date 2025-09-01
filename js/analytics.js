// js/analytics.js
// Si más adelante tienes backend, pon la URL base aquí (o déjala vacía para usar solo localStorage)
const API_BASE = ""; // ej: "https://api.unatomo.com/exports"

const STORAGE_KEY = "ua-export-count";

// ----- Helpers de persistencia local -----
function getLocal() {
  const n = parseInt(localStorage.getItem(STORAGE_KEY), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function setLocal(n) {
  localStorage.setItem(STORAGE_KEY, String(n));
  return n;
}

// ----- Lee el total (remoto si hay, si no fallback local) -----
export async function getGlobalExportCount() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/count`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.total === "number") {
          // sincroniza el cache local con el remoto
          return setLocal(data.total);
        }
      }
    } catch {
      // silencio: caemos al fallback local
    }
  }
  return getLocal();
}

// ----- Incrementa (remoto si hay, si no local) -----
export async function incrementGlobalExportCounter() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/bump`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.total === "number") {
          return setLocal(data.total);
        }
      }
    } catch {
      // silencio: caemos al fallback local
    }
  }
  // Fallback puramente local
  return setLocal(getLocal() + 1);
}

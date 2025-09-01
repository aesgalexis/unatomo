// js/analytics.js
// Contador global con CountAPI (https://api.countapi.xyz)
// Namespace y key están "namespaced" para tu dominio.

const BASE = "https://api.countapi.xyz";
const NAMESPACE = "unatomo_com";   // ajusta si quieres
const KEY = "exports_total";       // contador global de exportaciones

export async function incrementGlobalExportCounter() {
  try {
    const res = await fetch(`${BASE}/hit/${NAMESPACE}/${KEY}`);
    const data = await res.json();
    return (typeof data.value === "number") ? data.value : null;
  } catch {
    return null;
  }
}

export async function getGlobalExportCount() {
  try {
    const res = await fetch(`${BASE}/get/${NAMESPACE}/${KEY}`);
    const data = await res.json();
    return (typeof data.value === "number") ? data.value : 0;
  } catch {
    return 0;
  }
}

// analytics.js
const API = "https://tu-backend.com/api/exports"; // ajusta a tu endpoint

export async function incrementGlobalExportCounter() {
  // Debe devolver el total actualizado (number)
  try {
    const res = await fetch(`${API}/increment`, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); // { total: number }
    return data.total;
  } catch (e) {
    console.warn("incrementGlobalExportCounter error:", e);
    return null; // la UI simplemente no actualizará
  }
}

export async function getGlobalExportCount() {
  try {
    const res = await fetch(`${API}/count`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json(); // { total: number }
    return data.total;
  } catch (e) {
    console.warn("getGlobalExportCount error:", e);
    return null;
  }
}

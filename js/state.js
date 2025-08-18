// Modelo + persistencia + import/export

const STORAGE_KEY = "buttons-v1";

export const makeEmptyState = () => ({
  items: [], // { id, label, note, open, where: 'A'|'B' }
  history: [], // strings o {label, at}
  idSeq: 1,
});

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeEmptyState();
    const parsed = JSON.parse(raw);
    // Validación muy básica
    if (!parsed.items || !Array.isArray(parsed.items)) return makeEmptyState();
    return parsed;
  } catch {
    return makeEmptyState();
  }
}

export function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function nextId() {
  return state.idSeq++;
}

export function addItem(label, where = "A") {
  const id = nextId();
  state.items.push({ id, label: label || `Botón ${id}`, note: "", open: false, where });
  save();
  return id;
}

export function removeItem(id) {
  state.items = state.items.filter((it) => it.id !== id);
  save();
}

export function updateItem(id, patch) {
  const it = state.items.find((x) => x.id === id);
  if (it) Object.assign(it, patch);
  save();
}

export function moveItem(id, where, index) {
  const srcIdx = state.items.findIndex((x) => x.id === id);
  if (srcIdx === -1) return;
  const item = state.items[srcIdx];
  item.where = where;
  // Reordenar dentro de su destino
  const dest = state.items.filter((x) => x.where === where && x.id !== id);
  dest.splice(index, 0, item);
  // Reconciliar con el resto
  const others = state.items.filter((x) => x.where !== where);
  state.items = [...others, ...dest];
  save();
}

export function moveBy(id, delta) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  const same = state.items.filter((x) => x.where === it.where);
  const order = same.map((x) => x.id);
  const i = order.indexOf(id);
  const j = i + delta;
  if (j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  // reconstruir manteniendo "where" y notas
  const reordered = order.map((oid) => state.items.find((x) => x.id === oid));
  const others = state.items.filter((x) => x.where !== it.where);
  state.items = [...others, ...reordered];
  save();
}

export function resolveItem(id) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  state.history.unshift({ label: it.label, at: new Date().toISOString() });
  removeItem(id);
  save();
}

export function clearAll() {
  state = makeEmptyState();
  save();
}

// Exportar/Importar
export function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.download = `botones-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.items)) throw new Error("Formato inválido");
        state = parsed; // reemplazo total (simple)
        save();
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

// Modelo + persistencia + import/export

const STORAGE_KEY = "buttons-v1";
// IMPORTANTE: si cambias este valor, refleja el mismo en ui.js
const HISTORY_MAX = 16;

export const makeEmptyState = () => ({
  items: [],   // { id, label, note, open, where: 'A'|'B' }
  history: [], // { label, note, at }
  idSeq: 1,
});

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = makeEmptyState();
    if (!raw) return base;

    const parsed = JSON.parse(raw);

    // --- Normalización de items ---
    const itemsRaw = Array.isArray(parsed.items) ? parsed.items : [];
    const items = itemsRaw.map((it, idx) => {
      const id = Number.isFinite(+it?.id) ? +it.id : idx + 1;
      const where = it?.where === "B" ? "B" : "A";
      return {
        id,
        where,
        label:
          typeof it?.label === "string" && it.label.trim()
            ? it.label
            : `Attomic Button ${id}`,
        note: typeof it?.note === "string" ? it.note : "",
        open: !!it?.open,
      };
    });

    // --- Normalización de historial (migración string -> objeto) ---
    const historyRaw = Array.isArray(parsed.history) ? parsed.history : [];
    const history = historyRaw.map((h) => {
      if (typeof h === "string") {
        return { label: h, note: "", at: null };
      }
      return {
        label:
          typeof h?.label === "string" && h.label.trim()
            ? h.label
            : "(sin etiqueta)",
        note: typeof h?.note === "string" ? h.note : "",
        at: typeof h?.at === "string" ? h.at : null,
      };
    });

    // Limitar historial a HISTORY_MAX (más nuevo primero)
    const historyLimited = history.slice(0, HISTORY_MAX);

    // idSeq consistente (>= max id + 1)
    let idSeq = Number.isInteger(parsed.idSeq) ? parsed.idSeq : base.idSeq;
    const maxId = items.reduce((m, it) => Math.max(m, it.id), 0);
    if (!Number.isInteger(idSeq) || idSeq <= maxId) idSeq = maxId + 1;

    return { items, history: historyLimited, idSeq };
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
  state.items.push({
    id,
    label: label || `Botón ${id}`,
    note: "",
    open: false,
    where,
  });
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
  const existing = state.items.find((x) => x.id === id);
  if (!existing) return;

  // Construimos el destino con el orden actual (sin el elemento que movemos)
  const dest = state.items.filter((x) => x.where === where && x.id !== id);
  const clamped = Math.max(0, Math.min(index ?? dest.length, dest.length));
  const updated = { ...existing, where };

  dest.splice(clamped, 0, updated);

  // El resto (excluyendo el que movemos)
  const others = state.items.filter((x) => !(x.id === id || x.where === where));
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
  const reordered = order.map((oid) => state.items.find((x) => x.id === oid));
  const others = state.items.filter((x) => x.where !== it.where);
  state.items = [...others, ...reordered];
  save();
}

export function resolveItem(id) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  if (!Array.isArray(state.history)) state.history = [];
  state.history.unshift({
    label: it.label,
    note: (it.note || "").trim(),
    at: new Date().toISOString(),
  });
  // Limitar a HISTORY_MAX: FIFO (elimina los más antiguos)
  if (state.history.length > HISTORY_MAX) {
    state.history = state.history.slice(0, HISTORY_MAX);
  }
  removeItem(id); // ya hace save()
  save();
}

export function clearAll() {
  state = makeEmptyState();
  save();
}

// Limpiar solo el historial (útil para el botón "Clear")
export function clearHistory() {
  state.history = [];
  save();
}

// Exportar/Importar
export function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
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
        if (!parsed || !Array.isArray(parsed.items))
          throw new Error("Formato inválido");
        state = parsed; // reemplazo total
        // Re-normalizamos inmediatamente (capará items/historial, incluyendo HISTORY_MAX)
        state = (function normalize(s) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
          return load();
        })(state);
        save();
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

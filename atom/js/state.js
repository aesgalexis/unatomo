import { incrementGlobalExportCounter } from "./analytics.js";

const STORAGE_KEY = "buttons-v1";
const HISTORY_MAX = 16;

export const makeEmptyState = () => ({
  items: [],
  history: [],
  orbit: [],
  idSeq: 1,
  atomNumber: null,
  isotope: 0,
});

const DEFAULT_AB_COUNT = 5;

function makeDefaultState() {
  const base = makeEmptyState();
  const now = new Date().toISOString();
  for (let i = 1; i <= DEFAULT_AB_COUNT; i += 1) {
    base.items.push({
      id: i,
      where: "A",
      label: `AB${i}`,
      note: `text${i}`,
      open: false,
      createdAt: now,
    });
  }
  base.idSeq = DEFAULT_AB_COUNT + 1;
  return base;
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = makeEmptyState();
    if (!raw) {
      const seeded = makeDefaultState();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      } catch {}
      return seeded;
    }

    const parsed = JSON.parse(raw);

    const itemsRaw = Array.isArray(parsed.items) ? parsed.items : [];
    const items = itemsRaw.map((it, idx) => {
      const id = Number.isFinite(+it?.id) ? +it.id : idx + 1;
      const where = it?.where === "B" ? "B" : it?.where === "L" ? "L" : "A";
      return {
        id,
        where,
        label:
          typeof it?.label === "string" && it.label.trim()
            ? it.label
            : `Attomic Button ${id}`,
        note: typeof it?.note === "string" ? it.note : "",
        open: !!it?.open,
        createdAt: typeof it?.createdAt === "string" ? it.createdAt : null,
      };
    });

    const historyRaw = Array.isArray(parsed.history) ? parsed.history : [];
    const history = historyRaw.map((h) => {
      if (typeof h === "string") return { label: h, note: "", at: null };
      return {
        label:
          typeof h?.label === "string" && h.label.trim()
            ? h.label
            : "(sin etiqueta)",
        note: typeof h?.note === "string" ? h.note : "",
        at: typeof h?.at === "string" ? h.at : null,
      };
    });

    const orbitRaw = Array.isArray(parsed.orbit) ? parsed.orbit : [];
    const orbit = orbitRaw
      .map((o) => ({
        id: Number.isFinite(+o?.id) ? +o.id : null,
        label:
          typeof o?.label === "string" && o.label.trim()
            ? o.label
            : "(sin etiqueta)",
        note: typeof o?.note === "string" ? o.note : "",
        createdAt: typeof o?.createdAt === "string" ? o.createdAt : null,
        returnAt: typeof o?.returnAt === "string" ? o.returnAt : null,
        fromWhere: o?.fromWhere === "B" ? "B" : "A",
      }))
      .filter((o) => o.id != null && o.returnAt);

    let idSeq = Number.isInteger(parsed.idSeq) ? parsed.idSeq : base.idSeq;
    const maxItemsId = items.reduce((m, it) => Math.max(m, it.id), 0);
    const maxOrbitId = orbit.reduce((m, o) => Math.max(m, o.id || 0), 0);
    const maxId = Math.max(maxItemsId, maxOrbitId);
    if (!Number.isInteger(idSeq) || idSeq <= maxId) idSeq = maxId + 1;

    const atomNumber =
      Number.isInteger(parsed.atomNumber) && parsed.atomNumber > 0
        ? parsed.atomNumber
        : null;

    const isotope =
      Number.isInteger(parsed.isotope) && parsed.isotope >= 0
        ? parsed.isotope
        : 0;

    const tmp = { items, history, orbit, idSeq, atomNumber, isotope };
    landDueOrbitsIn(tmp);

    return tmp;
  } catch {
    return makeEmptyState();
  }
}

export function delayOrbit(id, addDays) {
  const o = state.orbit.find((x) => x.id === id);
  if (!o) return false;

  const d = Math.max(1, Math.min(365, Number(addDays)));
  const baseMs = Number.isFinite(Date.parse(o.returnAt))
    ? Date.parse(o.returnAt)
    : Date.now();
  o.returnAt = new Date(baseMs + d * 86_400_000).toISOString();

  save();
  return true;
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
    label: label || `Attomic Button ${id}`,
    note: "",
    open: false,
    where,
    createdAt: new Date().toISOString(),
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

  const dest = state.items.filter((x) => x.where === where && x.id !== id);
  const clamped = Math.max(0, Math.min(index ?? dest.length, dest.length));
  const updated = { ...existing, where };

  dest.splice(clamped, 0, updated);

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
  removeItem(id);
  save();
}

export function clearAll() {
  state = makeEmptyState();
  save();
}

export function clearHistory() {
  state.history = [];
  save();
}

export function sendToOrbit(id, days = 1) {
  const it = state.items.find((x) => x.id === id);
  if (!it) return false;

  const d = Math.max(1, Math.min(365, Number(days)));
  const ms = d * 24 * 60 * 60 * 1000;
  const returnAt = new Date(Date.now() + ms).toISOString();

  state.orbit = state.orbit || [];
  state.orbit.unshift({
    id: it.id,
    label: it.label,
    note: it.note || "",
    createdAt: it.createdAt || null,
    returnAt,
    fromWhere: it.where || "A",
  });

  removeItem(id);
  save();
  return true;
}

export function landDueOrbits(now = new Date()) {
  const changed = landDueOrbitsIn(state, now);
  if (changed) save();
  return changed;
}

function landDueOrbitsIn(s, now = new Date()) {
  const nowMs = now instanceof Date ? +now : Date.parse(now);
  const due = [];
  const keep = [];

  (s.orbit || []).forEach((o) => {
    const t = Date.parse(o.returnAt);
    if (Number.isFinite(t) && t <= nowMs) due.push(o);
    else keep.push(o);
  });

  if (due.length) {
    const landed = due.map((o) => ({
      id: o.id,
      label: o.label,
      note: o.note || "",
      open: false,
      where: "L",
      createdAt: o.createdAt || null,
    }));
    s.items = [...s.items, ...landed];
  }
  s.orbit = keep;
  return due.length;
}

function slugifyForFile(name) {
  const noDiacritics = name
    .toString()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const slug = noDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return slug || "export";
}

export async function exportJson() {
  const appTitle = localStorage.getItem("app-title") || "unátomo";

  const base = slugifyForFile(appTitle);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const filename = `${base}-${stamp}.json`;

  if (window.showSaveFilePicker && window.isSecureContext) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        excludeAcceptAllOption: false,
      });

      let newTotal = null;
      if (!Number.isInteger(state.atomNumber) || state.atomNumber <= 0) {
        newTotal = await incrementGlobalExportCounter();
        state.atomNumber = newTotal;
      }

      if (!Number.isInteger(state.isotope) || state.isotope < 0) state.isotope = 0;
      state.isotope += 1;

      save();

      const payload = { ...state, appTitle };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      if (newTotal != null) {
        window.dispatchEvent(
          new CustomEvent("global-export-count", { detail: { value: newTotal } })
        );
        window.dispatchEvent(
          new CustomEvent("atom-number-changed", { detail: { value: newTotal } })
        );
      }
      window.dispatchEvent(
        new CustomEvent("isotope-changed", { detail: { value: state.isotope } })
      );

      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("showSaveFilePicker falló, usando fallback:", err);
    }
  }

  let newTotal = null;
  if (!Number.isInteger(state.atomNumber) || state.atomNumber <= 0) {
    try {
      newTotal = await incrementGlobalExportCounter();
      state.atomNumber = newTotal;
    } catch (e) {
      console.warn("No se pudo asignar atomNumber en fallback:", e);
    }
  }

  if (!Number.isInteger(state.isotope) || state.isotope < 0) state.isotope = 0;
  state.isotope += 1;

  save();

  const payload = { ...state, appTitle };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (newTotal != null) {
    window.dispatchEvent(
      new CustomEvent("global-export-count", { detail: { value: newTotal } })
    );
    window.dispatchEvent(
      new CustomEvent("atom-number-changed", { detail: { value: newTotal } })
    );
  }
  window.dispatchEvent(
    new CustomEvent("isotope-changed", { detail: { value: state.isotope } })
  );
}

export function importJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));

        if (!parsed || !Array.isArray(parsed.items)) {
          throw new Error("Formato inválido");
        }

        if (typeof parsed.appTitle === "string" && parsed.appTitle.trim()) {
          localStorage.setItem("app-title", parsed.appTitle.trim());
        }

        if (!Number.isInteger(parsed.atomNumber) || parsed.atomNumber <= 0) {
          delete parsed.atomNumber;
        }

        if (!Number.isInteger(parsed.isotope) || parsed.isotope < 0) {
          parsed.isotope = 0;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        state = load();
        save();

        window.dispatchEvent(
          new CustomEvent("atom-number-changed", {
            detail: {
              value: Number.isInteger(state.atomNumber) ? state.atomNumber : null,
            },
          })
        );

        window.dispatchEvent(
          new CustomEvent("isotope-changed", {
            detail: {
              value: Number.isInteger(state.isotope) ? state.isotope : 0,
            },
          })
        );

        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.readAsText(file);
  });
}

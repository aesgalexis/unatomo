import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-functions.js";

const CACHE_KEY = "unatomo_nfc_public_stats_v1";
const CACHE_FRESH_MS = 60 * 60 * 1000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const normalizeCount = (value) => {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) return null;
  return count;
};

const normalizeStats = (value) => {
  const machines = normalizeCount(value?.machines);
  const registeredUsers = normalizeCount(value?.registeredUsers);
  const linkedTags = normalizeCount(value?.linkedTags);
  if (machines == null || registeredUsers == null || linkedTags == null) return null;
  return {machines, registeredUsers, linkedTags};
};

const readCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    const stats = normalizeStats(parsed?.stats);
    const cachedAt = Number(parsed?.cachedAt);
    if (!stats || !Number.isFinite(cachedAt)) return null;
    return {stats, cachedAt};
  } catch {
    return null;
  }
};

const writeCache = (stats) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({stats, cachedAt: Date.now()}));
  } catch {}
};

const renderStats = (stats, lang) => {
  const section = document.getElementById("landing-public-stats");
  if (!section) return;
  const formatter = new Intl.NumberFormat(lang === "en" ? "en" : "es");
  Object.entries(stats).forEach(([key, value]) => {
    const target = section.querySelector(`[data-public-stat="${key}"]`);
    if (target) target.textContent = formatter.format(value);
  });
  section.hidden = false;
  section.closest(".landing-intro")?.classList.add("has-public-stats");
};

export const initPublicNfcLandingStats = async ({db, functions, lang}) => {
  const cached = readCache();
  const cacheAge = cached ? Date.now() - cached.cachedAt : Infinity;
  if (cached && cacheAge <= CACHE_MAX_AGE_MS) renderStats(cached.stats, lang);
  if (cached && cacheAge <= CACHE_FRESH_MS) return;

  try {
    const snapshot = await getDoc(doc(db, "public_metrics", "nfc"));
    let stats = snapshot.exists() ? normalizeStats(snapshot.data()) : null;
    if (!stats) {
      const getStats = httpsCallable(functions, "getPublicNfcLandingStats");
      const response = await getStats();
      stats = normalizeStats(response.data);
    }
    if (!stats) return;
    writeCache(stats);
    renderStats(stats, lang);
  } catch {
    // The landing remains complete without metrics when Firebase is unavailable.
  }
};

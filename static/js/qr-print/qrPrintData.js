import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "/static/js/firebase/firebaseApp.js";
import { normalizeDashboardTitle } from "/static/js/dashboard/layout/dashboardLayoutModel.mjs";

export const applyQrDashboardTopbarTitle = async (uid) => {
  const setTitle = (value, attempts = 0) => {
    const titleEl = document.getElementById("topbar-title");
    if (titleEl) {
      titleEl.textContent = value;
      return;
    }
    if (attempts < 20) window.setTimeout(() => setTitle(value, attempts + 1), 50);
  };
  let title = "Dashboard";
  setTitle(title);
  try {
    const [profileSnap, layoutSnap] = await Promise.all([
      getDoc(doc(db, "users", uid)),
      getDoc(doc(db, "dashboard_layout", uid))
    ]);
    const companyTitle = normalizeDashboardTitle(
      profileSnap.exists()
        ? profileSnap.data()?.company || profileSnap.data()?.companyName
        : ""
    );
    const layoutTitle = normalizeDashboardTitle(
      layoutSnap.exists() ? layoutSnap.data()?.dashboardTitle : ""
    );
    title = companyTitle || layoutTitle || title;
  } catch {}
  setTitle(title);
};

const normalizeMachine = (raw) => ({
  id: raw.id || "",
  title: (raw.title || raw.nombre || "").toString().trim(),
  tagId: (raw.tagId || "").toString().trim(),
  tagQrUrl: (raw.tagQrUrl || "").toString().trim(),
  qrAccessEnabled: raw.qrAccessEnabled !== false,
  status: raw.status || "",
  tasks: Array.isArray(raw.tasks) ? raw.tasks : []
});

const resolveQrUrl = async (machine) => {
  if (machine.tagQrUrl) return machine.tagQrUrl;
  if (!machine.tagId) return "";
  try {
    const snap = await getDoc(doc(db, "tags", machine.tagId));
    if (!snap.exists()) return "";
    return (snap.data()?.qrUrl || "").toString().trim();
  } catch {
    return "";
  }
};

const fetchOwnerMachines = async (uid) => {
  const ownerQuery = query(collection(db, "machines"), where("ownerUid", "==", uid));
  const snap = await getDocs(ownerQuery);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

const fetchAdminMachines = async (uid) => {
  const linksQuery = query(
    collection(db, "admin_machine_links"),
    where("adminUid", "==", uid)
  );
  const linksSnap = await getDocs(linksQuery);
  const links = linksSnap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((link) => link.status === "accepted" && link.machineId);
  const machines = await Promise.all(links.map(async (link) => {
    try {
      const snap = await getDoc(doc(db, "machines", link.machineId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch {
      return null;
    }
  }));
  return machines.filter(Boolean);
};

export const fetchQrAccessibleMachines = async (uid) => {
  const [ownerResult, adminResult] = await Promise.allSettled([
    fetchOwnerMachines(uid),
    fetchAdminMachines(uid)
  ]);
  if (ownerResult.status === "rejected" && adminResult.status === "rejected") {
    throw ownerResult.reason || adminResult.reason;
  }
  return [
    ...(ownerResult.status === "fulfilled" ? ownerResult.value : []),
    ...(adminResult.status === "fulfilled" ? adminResult.value : [])
  ];
};

export const buildQrMachineState = async (machines = [], locale = "es") => {
  const map = new Map();
  const normalizedMachines = machines.map(normalizeMachine);
  const qrUrls = await Promise.all(normalizedMachines.map(resolveQrUrl));
  normalizedMachines.forEach((normalized, index) => {
    normalized.tagQrUrl = qrUrls[index] || "";
    if (normalized.id) map.set(normalized.id, normalized);
  });
  return Array.from(map.values()).sort((a, b) =>
    a.title.localeCompare(b.title, locale, { sensitivity: "base" })
  );
};

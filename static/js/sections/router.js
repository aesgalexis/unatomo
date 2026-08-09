import { getCurrentLang } from "/static/js/site/locale.js";
import { render as renderTags } from "./tags.js";
import { render as renderSoporte } from "./soporte.js";
import { render as renderNovedades } from "./novedades.js";

const dashboardMount = document.getElementById("dashboard-mount");
const sectionMount = document.getElementById("section-mount");

const sectionMap = {
  dashboard: { title: "Dashboard", render: null },
  tags: { title: "Unatomo", render: renderTags },
  contacto: { title: "Unatomo", render: renderSoporte },
  novedades: { title: "Unatomo", render: renderNovedades }
};

const getSectionFromHash = () => {
  const hash = window.location.hash
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();
  if (!hash) return "dashboard";
  return sectionMap[hash] ? hash : "dashboard";
};

const setTitle = (sectionId) => {
  const nextTitle = sectionMap[sectionId]?.title || "Dashboard";
  document.body.dataset.topbarTitle = nextTitle;

  const titleEl = document.getElementById("topbar-title");
  if (titleEl) {
    titleEl.textContent = nextTitle;
  }
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
};

const renderSection = () => {
  const sectionId = getSectionFromHash();
  const section = sectionMap[sectionId];
  if (!section) return;

  setTitle(sectionId);

  if (sectionId === "dashboard") {
    if (dashboardMount) dashboardMount.hidden = false;
    if (sectionMount) {
      sectionMount.hidden = true;
      sectionMount.innerHTML = "";
    }
    return;
  }

  scrollToTop();

  if (dashboardMount) dashboardMount.hidden = true;
  if (!sectionMount) return;

  sectionMount.hidden = false;
  sectionMount.innerHTML = "";
  if (typeof section.render === "function") {
    section.render(sectionMount);
  }
};

window.addEventListener("hashchange", renderSection);
window.addEventListener("DOMContentLoaded", () => {
  const sectionId = getSectionFromHash();
  if (sectionId !== "dashboard") {
    if (dashboardMount) dashboardMount.hidden = true;
    if (sectionMount) sectionMount.hidden = false;
  }
  renderSection();
});

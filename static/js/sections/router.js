import { getCurrentLang } from "/static/js/site/locale.js";
import { render as renderFaqs } from "./faqs.js";
import { render as renderTags } from "./tags.js";
import { render as renderSoporte } from "./soporte.js";
import { render as renderNovedades } from "./novedades.js";

const dashboardMount = document.getElementById("dashboard-mount");
const sectionMount = document.getElementById("section-mount");
const lang = getCurrentLang();

const sectionMap = {
  dashboard: { title: "Dashboard", render: null },
  faqs: { title: "Unatomo", render: renderFaqs },
  tags: { title: "Unatomo", render: renderTags },
  contacto: { title: "Unatomo", render: renderSoporte },
  novedades: { title: "Unatomo", render: renderNovedades }
};
const navText = {
  back: lang === "en" ? "Back" : "Volver",
  top: lang === "en" ? "Top" : "Arriba",
};
let syncTopButtonHandler = null;

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
    if (syncTopButtonHandler) {
      window.removeEventListener("scroll", syncTopButtonHandler);
      syncTopButtonHandler = null;
    }
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
  renderSectionNav();
};

const renderSectionNav = () => {
  if (!sectionMount || sectionMount.hidden) return;
  if (syncTopButtonHandler) {
    window.removeEventListener("scroll", syncTopButtonHandler);
    syncTopButtonHandler = null;
  }

  const nav = document.createElement("div");
  nav.className = "scroll-top-container";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "scroll-top-button";
  backBtn.textContent = navText.back;
  backBtn.addEventListener("click", () => {
    window.location.hash = "#/dashboard";
  });

  const topBtn = document.createElement("button");
  topBtn.type = "button";
  topBtn.className = "scroll-top-button";
  topBtn.textContent = navText.top;
  topBtn.hidden = window.scrollY < 24;
  topBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  syncTopButtonHandler = () => {
    topBtn.hidden = window.scrollY < 24;
  };

  window.addEventListener("scroll", syncTopButtonHandler, { passive: true });

  nav.appendChild(backBtn);
  nav.appendChild(topBtn);
  sectionMount.appendChild(nav);
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

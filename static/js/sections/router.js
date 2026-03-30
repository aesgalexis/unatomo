import { getCurrentLang } from "/static/js/site/locale.js";
import { render as renderFaqs } from "./faqs.js";
import { render as renderTags } from "./tags.js";
import { render as renderSoporte } from "./soporte.js";

const dashboardMount = document.getElementById("dashboard-mount");
const sectionMount = document.getElementById("section-mount");
const lang = getCurrentLang();

const sectionMap = {
  dashboard: { title: "Dashboard", render: null },
  faqs: { title: "FAQs", render: renderFaqs },
  tags: { title: lang === "en" ? "Physical tags" : "Tags f\u00edsicos", render: renderTags },
  contacto: { title: lang === "en" ? "Contact" : "Contacto", render: renderSoporte }
};

const getSectionFromHash = () => {
  const hash = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  if (!hash) return "dashboard";
  return sectionMap[hash] ? hash : "dashboard";
};

const setTitle = (sectionId) => {
  const titleEl = document.getElementById("section-title");
  if (!titleEl) return;
  titleEl.textContent = sectionMap[sectionId]?.title || "Dashboard";
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

import { render as renderFaqs } from "./faqs.js";
import { render as renderTags } from "./tags.js";
import { render as renderSoporte } from "./soporte.js";

const dashboardMount = document.getElementById("dashboard-mount");
const sectionMount = document.getElementById("section-mount");

const sectionMap = {
  dashboard: { title: "Dashboard", render: null },
  faqs: { title: "FAQs", render: renderFaqs },
  tags: { title: "Tags físicos / precios", render: renderTags },
  contacto: { title: "Contacto", render: renderSoporte }
};

const getSectionFromHash = () => {
  const hash = window.location.hash || "";
  const match = hash.match(/^#\/([^/?#]+)/);
  return match ? match[1] : "dashboard";
};

const updateMenuActive = (key) => {
  document.querySelectorAll(".topbar-menu-link").forEach((link) => {
    const panel = link.getAttribute("data-panel");
    link.classList.toggle("is-active", panel === key);
  });
};

const renderSection = () => {
  const key = getSectionFromHash();
  const section = sectionMap[key] || sectionMap.dashboard;
  const activeKey = sectionMap[key] ? key : "dashboard";
  if (dashboardMount) {
    dashboardMount.hidden = key !== "dashboard";
    dashboardMount.style.display = key === "dashboard" ? "" : "none";
  }
  if (sectionMount) {
    sectionMount.hidden = key === "dashboard";
    sectionMount.style.display = key === "dashboard" ? "none" : "";
    if (activeKey !== "dashboard" && typeof section.render === "function") {
      sectionMount.innerHTML = "";
      section.render(sectionMount);
    }
  }
  updateMenuActive(activeKey);
  document.body.classList.remove("menu-open");
};

window.addEventListener("hashchange", renderSection);
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".topbar-menu-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      document.body.classList.remove("menu-open");
      document.body.classList.add("menu-locked");
    });
  });
  const logoGroup = document.querySelector(".topbar-logo-group");
  if (logoGroup) {
    logoGroup.addEventListener("mouseleave", () => {
      document.body.classList.remove("menu-locked");
    });
    logoGroup.addEventListener("focusout", () => {
      document.body.classList.remove("menu-locked");
    });
  }
  renderSection();
});

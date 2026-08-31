import { initTopbarLogoMotion } from "/static/js/topbar/loading-logo.js";
import { initContactForm } from "/static/js/contact-form-controller.js";

initTopbarLogoMotion();

const atomContainer = document.getElementById("atom");
const atomScreenQuery = window.matchMedia("(max-width: 900px)");
let atomWidget = null;
let atomWidgetModule = null;

const syncAtomWidget = async () => {
  if (!atomContainer) return;

  if (atomScreenQuery.matches) {
    atomWidget?.destroy?.();
    atomWidget = null;
    return;
  }

  if (atomWidget) return;
  atomWidgetModule ||= import("/laundryservices/ls_atom-widget/ls_atom-widget.js");
  const { initAtomWidget } = await atomWidgetModule;
  if (atomScreenQuery.matches || atomWidget) return;

  atomWidget = initAtomWidget({
    container: atomContainer,
    pixelRatioCap: 1.8,
    atomScale: 0.8267,
    renderMode: "floating",
    interactionTarget: atomContainer,
    canvasScale: 1.9,
    enableZoom: true,
    zoomMaxPercent: 100,
    initialZoomLevel: 8,
  });
};

syncAtomWidget();
if (atomScreenQuery.addEventListener) {
  atomScreenQuery.addEventListener("change", syncAtomWidget);
} else {
  atomScreenQuery.addListener(syncAtomWidget);
}

const langToggle = document.getElementById("lang-toggle");
const langMenu = document.getElementById("lang-menu");

const closeLanguageMenu = () => {
  if (!langToggle || !langMenu) return;
  langMenu.hidden = true;
  langToggle.setAttribute("aria-expanded", "false");
};

langToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  const opening = langMenu?.hidden ?? false;
  if (langMenu) langMenu.hidden = !opening;
  langToggle.setAttribute("aria-expanded", String(opening));
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".lang-picker")) closeLanguageMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeLanguageMenu();
});

const studioFooterCopy = {
  es: { tagline: "Tecnología aplicada a problemas reales.", powered: "Powered by", about: "/es/nosotros/", privacy: "/studio/es/privacidad/", privacyLabel: "Política de privacidad y cookies", contact: "Contacto", hours: "De lunes a viernes, de 09:00 a 15:00 (Horario de España / CET).", legal: "Todos los derechos reservados." },
  en: { tagline: "Technology applied to real problems.", powered: "Powered by", about: "/en/about/", privacy: "/studio/en/privacy/", privacyLabel: "Privacy and cookie policy", contact: "Contact", hours: "Monday to Friday, 09:00 to 15:00 (Spain / CET).", legal: "All rights reserved." },
  it: { tagline: "Tecnologia applicata a problemi reali.", powered: "Powered by", about: "/it/chi-siamo/", privacy: "/studio/it/privacy/", privacyLabel: "Privacy e cookie", contact: "Contatto", hours: "Dal lunedì al venerdì, dalle 09:00 alle 15:00 (Spagna / CET).", legal: "Tutti i diritti riservati." },
  el: { tagline: "Τεχνολογία για πραγματικά προβλήματα.", powered: "Powered by", about: "/el/schetika-me-emas/", privacy: "/studio/el/aporrito/", privacyLabel: "Απόρρητο και cookies", contact: "Επικοινωνία", hours: "Δευτέρα έως Παρασκευή, 09:00–15:00 (Ισπανία / CET).", legal: "Με επιφύλαξη παντός δικαιώματος." },
};
const footerLanguage = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
const footerCopy = studioFooterCopy[footerLanguage] || studioFooterCopy.es;
const footerHost = document.querySelector(".studio-shoe");
const originalShoeControl = footerHost?.querySelector(".studio-shoe-control");
const originalShoeToggle = originalShoeControl?.querySelector(".studio-shoe-toggle");
const originalShoeIcon = originalShoeToggle?.querySelector(".studio-shoe-icon");
const originalShoePanel = originalShoeControl?.querySelector(".studio-shoe-panel");

if (footerHost && originalShoeControl && originalShoeToggle && originalShoePanel) {
  footerHost.className = "legal-footer ls-footer-disclosure";
  originalShoeControl.className = "ls-footer-disclosure-control";
  originalShoeToggle.className = "ls-footer-disclosure-toggle";
  originalShoeToggle.setAttribute("aria-controls", "ls-footer-disclosure-panel");
  if (originalShoeIcon) originalShoeIcon.className = "ls-footer-disclosure-icon";
  originalShoePanel.id = "ls-footer-disclosure-panel";
  originalShoePanel.className = "ls-footer-disclosure-panel";
  originalShoePanel.innerHTML = `
    <div class="ls-footer-disclosure-identity">
      <p class="ls-footer-disclosure-tagline">${footerCopy.tagline}</p>
      <p class="ls-footer-disclosure-powered">${footerCopy.powered} <a href="${footerCopy.about}">people who like machines</a>.</p>
      <p class="ls-footer-disclosure-privacy-row"><a class="ls-footer-disclosure-privacy" href="${footerCopy.privacy}">${footerCopy.privacyLabel}</a></p>
      <p class="ls-footer-disclosure-legal">© ${new Date().getFullYear()} UNATOMO CORE SL · ${footerCopy.legal}</p>
    </div>
    <div class="ls-footer-disclosure-meta">
      <p class="ls-footer-disclosure-contact-title">${footerCopy.contact}</p>
      <div class="ls-footer-disclosure-contact-list">
        <a class="ls-footer-disclosure-contact-item" href="mailto:info@unatomo.com?subject=UNATOMO%20Studio"><span class="ls-footer-disclosure-contact-icon"><svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 13 20 6.01V6H4zm0 12h16V8l-8 7-8-7v10z"/></svg></span><span>info@unatomo.com</span></a>
        <a class="ls-footer-disclosure-contact-item" href="tel:+34871252049"><span class="ls-footer-disclosure-contact-icon"><svg viewBox="0 0 24 24"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.22z"/></svg></span><span>+34 871 25 20 49</span></a>
        <div class="ls-footer-disclosure-contact-item"><span class="ls-footer-disclosure-contact-icon"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.009 8.009 0 01-8 8zm.5-13h-1v6l5 3 .5-.86-4.5-2.64z"/></svg></span><span>${footerCopy.hours}</span></div>
        <a class="ls-footer-disclosure-contact-item" href="https://www.google.com/maps/search/?api=1&amp;query=07440%20Muro%2C%20Mallorca%2C%20Espa%C3%B1a" target="_blank" rel="noopener"><span class="ls-footer-disclosure-contact-icon"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span><span>07440 Muro, Mallorca, España</span></a>
      </div>
    </div>`;
}

const shoe = document.querySelector(".ls-footer-disclosure-control");
const shoeToggle = shoe?.querySelector(".ls-footer-disclosure-toggle");
const shoePanel = shoe?.querySelector(".ls-footer-disclosure-panel");
let closeTimer = null;
let shoeScrollFrame = null;

const scrollToDocumentEnd = () => {
  const documentHeight = Math.max(document.documentElement?.scrollHeight || 0, document.body?.scrollHeight || 0);
  window.scrollTo({ top: documentHeight, left: 0, behavior: "auto" });
};

const followShoeExpansion = (until) => {
  if (!shoe?.classList.contains("is-open")) {
    shoeScrollFrame = null;
    return;
  }
  const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
  if (isMobileViewport) {
    scrollToDocumentEnd();
  } else {
    const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
    const overflow = shoe.getBoundingClientRect().bottom + 16 - viewportBottom;
    if (overflow > 0) window.scrollBy({ top: overflow, left: 0, behavior: "auto" });
  }
  if (performance.now() < until) {
    shoeScrollFrame = window.requestAnimationFrame(() => followShoeExpansion(until));
  } else if (isMobileViewport) {
    shoeScrollFrame = window.requestAnimationFrame(() => {
      scrollToDocumentEnd();
      shoeScrollFrame = null;
    });
  } else {
    shoeScrollFrame = null;
  }
};

const closeShoe = ({ restoreFocus = false } = {}) => {
  if (!shoe || !shoeToggle || !shoePanel || shoePanel.hidden) return;
  if (closeTimer !== null) window.clearTimeout(closeTimer);
  if (shoeScrollFrame !== null) window.cancelAnimationFrame(shoeScrollFrame);
  shoeScrollFrame = null;
  shoe.classList.remove("is-open");
  shoe.classList.add("is-closing");
  shoeToggle.setAttribute("aria-expanded", "false");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  closeTimer = window.setTimeout(() => {
    shoePanel.hidden = true;
    shoe.classList.remove("is-closing");
    closeTimer = null;
  }, reducedMotion ? 0 : 180);
  if (restoreFocus) shoeToggle.focus();
};

shoeToggle?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (!shoe || !shoePanel) return;
  const opening = shoeToggle.getAttribute("aria-expanded") !== "true";
  if (!opening) {
    closeShoe();
    return;
  }
  if (closeTimer !== null) window.clearTimeout(closeTimer);
  shoePanel.hidden = false;
  shoe.classList.remove("is-closing");
  shoe.classList.add("is-opening");
  shoeToggle.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => {
    shoe.classList.remove("is-opening");
    shoe.classList.add("is-open");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    followShoeExpansion(performance.now() + (reducedMotion ? 0 : 380));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".ls-footer-disclosure-control")) closeShoe();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && shoePanel && !shoePanel.hidden) {
    event.preventDefault();
    closeShoe({ restoreFocus: true });
  }
});

const PAGE_NAV_COPY = {
  es: { back: "Volver", top: "Arriba" },
  en: { back: "Back", top: "Top" },
  it: { back: "Indietro", top: "In alto" },
  el: { back: "Πίσω", top: "Επάνω" },
};
const BACK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14.7 5.3-1.4-1.4L5.2 12l8.1 8.1 1.4-1.4L9 13h10v-2H9l5.7-5.7Z"></path></svg>';
const TOP_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 4-8.1 8.1 1.4 1.4 5.7-5.7V20h2V7.8l5.7 5.7 1.4-1.4L12 4Z"></path></svg>';
const pageLanguage = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
const pageNavLabels = PAGE_NAV_COPY[pageLanguage] || PAGE_NAV_COPY.es;

const createPageNavButton = (label, icon) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "studio-page-nav-button";
  button.setAttribute("aria-label", label);
  button.innerHTML = icon;
  return button;
};

const pageNav = document.createElement("nav");
pageNav.className = "studio-page-nav";
pageNav.setAttribute("aria-label", `${pageNavLabels.back} / ${pageNavLabels.top}`);
const backButton = createPageNavButton(pageNavLabels.back, BACK_ICON);
const topButton = createPageNavButton(pageNavLabels.top, TOP_ICON);
topButton.hidden = true;

backButton.addEventListener("click", () => {
  const studioRoot = `/studio/${pageLanguage}/`;
  const isStudioRoot = window.location.pathname.replace(/index\.html$/i, "") === studioRoot;
  window.location.href = isStudioRoot ? "/" : studioRoot;
});
topButton.addEventListener("click", () => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
});

let pageNavScrollFrame = 0;
const syncTopButton = () => {
  pageNavScrollFrame = 0;
  topButton.hidden = window.scrollY < 24;
};
window.addEventListener("scroll", () => {
  if (pageNavScrollFrame) return;
  pageNavScrollFrame = window.requestAnimationFrame(syncTopButton);
}, { passive: true });

pageNav.append(backButton, topButton);
document.body.appendChild(pageNav);
syncTopButton();

const contactForm = document.querySelector(".studio-contact-form");
if (contactForm) {
  initContactForm(contactForm, { statusSelector: ".studio-form-status" });
}

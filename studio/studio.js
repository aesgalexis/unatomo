import { initTopbarLogoMotion } from "/static/js/topbar/loading-logo.js";

initTopbarLogoMotion();

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

const shoe = document.querySelector(".studio-shoe-control");
const shoeToggle = shoe?.querySelector(".studio-shoe-toggle");
const shoePanel = shoe?.querySelector(".studio-shoe-panel");
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
  scrollToDocumentEnd();
  if (performance.now() < until) {
    shoeScrollFrame = window.requestAnimationFrame(() => followShoeExpansion(until));
  } else {
    shoeScrollFrame = window.requestAnimationFrame(() => {
      scrollToDocumentEnd();
      shoeScrollFrame = null;
    });
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
  shoeToggle.setAttribute("aria-expanded", "true");
  window.requestAnimationFrame(() => {
    shoe.classList.add("is-open");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    followShoeExpansion(performance.now() + (reducedMotion ? 0 : 420));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".studio-shoe-control")) closeShoe();
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
  window.location.href = "/";
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
  const contactStatus = contactForm.querySelector(".studio-form-status");
  const contactSubmit = contactForm.querySelector('button[type="submit"]');
  const contactMessages = {
    es: { sending: "Enviando...", success: "Mensaje enviado correctamente.", error: "No se ha podido enviar. Inténtalo de nuevo." },
    en: { sending: "Sending...", success: "Message sent successfully.", error: "The message could not be sent. Please try again." },
    it: { sending: "Invio...", success: "Messaggio inviato correttamente.", error: "Impossibile inviare il messaggio. Riprova." },
    el: { sending: "Αποστολή...", success: "Το μήνυμα στάλθηκε επιτυχώς.", error: "Δεν ήταν δυνατή η αποστολή. Δοκιμάστε ξανά." },
  };

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.checkValidity()) return contactForm.reportValidity();
    const messages = contactMessages[pageLanguage] || contactMessages.es;
    contactStatus.hidden = false;
    contactStatus.textContent = messages.sending;
    delete contactStatus.dataset.state;
    contactSubmit.disabled = true;
    try {
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: new FormData(contactForm),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("send-failed");
      contactStatus.textContent = messages.success;
      contactStatus.dataset.state = "success";
      contactForm.reset();
    } catch {
      contactStatus.textContent = messages.error;
      contactStatus.dataset.state = "error";
    } finally {
      contactSubmit.disabled = false;
    }
  });
}

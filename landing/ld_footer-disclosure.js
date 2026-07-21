(() => {
  const COPY = {
    es: {
      tagline: "Conectamos personas, m\u00e1quinas y procesos.",
      credits: "Tecnolog\u00eda y cr\u00e9ditos",
      technology:
        "Desarrollado con herramientas de OpenAI Codex. Autenticaci\u00f3n, datos y almacenamiento sobre Firebase de Google; c\u00f3digo y publicaci\u00f3n con GitHub.",
      legal: "UNATOMO CORE SL - Todos los derechos reservados."
    },
    en: {
      tagline: "We connect people, machines, and processes.",
      credits: "Technology and credits",
      technology:
        "Developed using tools from OpenAI Codex. Authentication, data, and storage on Google Firebase; code and publishing with GitHub.",
      legal: "UNATOMO CORE SL - All rights reserved."
    },
    it: {
      tagline: "Connettiamo persone, macchine e processi.",
      credits: "Tecnologia e crediti",
      technology:
        "Sviluppato con strumenti di OpenAI Codex. Autenticazione, dati e archiviazione su Google Firebase; codice e pubblicazione con GitHub.",
      legal: "UNATOMO CORE SL - Tutti i diritti riservati."
    },
    el: {
      tagline: "\u03a3\u03c5\u03bd\u03b4\u03ad\u03bf\u03c5\u03bc\u03b5 \u03b1\u03bd\u03b8\u03c1\u03ce\u03c0\u03bf\u03c5\u03c2, \u03bc\u03b7\u03c7\u03b1\u03bd\u03ad\u03c2 \u03ba\u03b1\u03b9 \u03b4\u03b9\u03b1\u03b4\u03b9\u03ba\u03b1\u03c3\u03af\u03b5\u03c2.",
      credits: "\u03a4\u03b5\u03c7\u03bd\u03bf\u03bb\u03bf\u03b3\u03af\u03b1 \u03ba\u03b1\u03b9 \u03b9\u03b4\u03b9\u03cc\u03c4\u03b7\u03c4\u03b5\u03c2",
      technology:
        "\u0391\u03bd\u03b1\u03c0\u03c4\u03cd\u03c7\u03b8\u03b7\u03ba\u03b5 \u03bc\u03b5 \u03b5\u03c1\u03b3\u03b1\u03bb\u03b5\u03af\u03b1 OpenAI Codex. \u039f \u03ad\u03bb\u03b5\u03b3\u03c7\u03bf\u03c2 \u03c4\u03b1\u03c5\u03c4\u03cc\u03c4\u03b7\u03c4\u03b1\u03c2, \u03c4\u03b1 \u03b4\u03b5\u03b4\u03bf\u03bc\u03ad\u03bd\u03b1 \u03ba\u03b1\u03b9 \u03b7 \u03b7\u03bb\u03b5\u03ba\u03c4\u03c1\u03bf\u03bd\u03b9\u03ba\u03ae \u03b1\u03c0\u03bf\u03b8\u03ae\u03ba\u03b5\u03c5\u03c3\u03b7 \u03b1\u03be\u03b9\u03bf\u03c0\u03bf\u03b9\u03bf\u03cd\u03bd \u03c4\u03bf Google Firebase, \u03b5\u03bd\u03ce \u03bf \u03ba\u03ce\u03b4\u03b9\u03ba\u03b1\u03c2 \u03ba\u03b1\u03b9 \u03b7 \u03b4\u03b7\u03bc\u03bf\u03c3\u03af\u03b5\u03c5\u03c3\u03b7 \u03b3\u03af\u03bd\u03bf\u03bd\u03c4\u03b1\u03b9 \u03bc\u03b5 GitHub.",
      legal: "UNATOMO CORE SL - \u039c\u03b5 \u03b5\u03c0\u03b9\u03c6\u03cd\u03bb\u03b1\u03be\u03b7 \u03c0\u03b1\u03bd\u03c4\u03cc\u03c2 \u03b4\u03b9\u03ba\u03b1\u03b9\u03ce\u03bc\u03b1\u03c4\u03bf\u03c2."
    }
  };

  const getCopy = () => COPY[document.documentElement.lang] || COPY.es;

  window.renderLandingDisclosureFooter = ({ legalFooterText = "" } = {}) => {
    const legalFooter = document.getElementById("legal-footer");
    if (!legalFooter) return;
    const copy = getCopy();
    if (typeof legalFooter.__updateLandingDisclosure === "function") {
      legalFooter.__updateLandingDisclosure({ copy, legalFooterText });
      return;
    }

    const privacyFooter = legalFooter.nextElementSibling?.classList.contains("footer-link")
      ? legalFooter.nextElementSibling
      : null;
    const privacyLink = privacyFooter?.querySelector("a") || null;
    legalFooter.textContent = "";
    legalFooter.classList.add("footer-disclosure", "landing-footer-disclosure");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "footer-disclosure-toggle";
    toggle.setAttribute("aria-label", "Footer");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "landing-footer-disclosure-panel");
    toggle.innerHTML = '<span class="footer-disclosure-icon" aria-hidden="true"></span>';

    const panel = document.createElement("div");
    panel.id = "landing-footer-disclosure-panel";
    panel.className = "footer-disclosure-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Footer");
    panel.hidden = true;

    const identity = document.createElement("div");
    identity.className = "footer-disclosure-identity";
    const brand = document.createElement("div");
    brand.className = "footer-disclosure-brand";
    brand.textContent = "UNATOMO";
    const tagline = document.createElement("p");
    tagline.className = "footer-disclosure-tagline";
    const company = document.createElement("p");
    company.className = "footer-disclosure-company";
    company.append("Powered by ");
    const poweredByLink = document.createElement("a");
    poweredByLink.href = "https://unatomo.com/";
    poweredByLink.textContent = "UNATOMO";
    company.appendChild(poweredByLink);
    identity.appendChild(brand);
    identity.appendChild(tagline);
    identity.appendChild(company);
    panel.appendChild(identity);

    const meta = document.createElement("div");
    meta.className = "footer-disclosure-meta";
    const creditsTitle = document.createElement("div");
    creditsTitle.className = "footer-disclosure-credits-title";
    const technologyLinks = document.createElement("div");
    technologyLinks.className = "footer-disclosure-tech-links";
    [
      { href: "https://openai.com/", label: "OpenAI" },
      { href: "https://openai.com/codex/", label: "Codex" },
      { href: "https://firebase.google.com/", label: "Firebase by Google" },
      { href: "https://github.com/", label: "GitHub" }
    ].forEach(({ href, label }) => {
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.textContent = label;
      technologyLinks.appendChild(anchor);
    });
    const technologyNote = document.createElement("p");
    technologyNote.className = "footer-disclosure-tech-note";
    meta.appendChild(creditsTitle);
    meta.appendChild(technologyLinks);
    meta.appendChild(technologyNote);
    panel.appendChild(meta);

    const legal = document.createElement("p");
    legal.className = "footer-disclosure-legal";
    const legalTextNode = document.createTextNode("");
    legal.appendChild(legalTextNode);
    if (privacyLink) {
      privacyLink.classList.add("footer-disclosure-privacy");
      legal.append(" \u00b7 ");
      legal.appendChild(privacyLink);
      privacyFooter.remove();
    }
    identity.appendChild(legal);

    const control = document.createElement("div");
    control.className = "footer-disclosure-control";
    control.appendChild(toggle);
    control.appendChild(panel);
    legalFooter.appendChild(control);

    legalFooter.__updateLandingDisclosure = ({ copy: nextCopy, legalFooterText: nextLegal }) => {
      tagline.textContent = nextCopy.tagline;
      creditsTitle.textContent = nextCopy.credits;
      technologyNote.textContent = nextCopy.technology;
      legalTextNode.nodeValue = `\u00a9 ${new Date().getFullYear()} ${nextLegal || nextCopy.legal}`;
    };
    legalFooter.__updateLandingDisclosure({ copy, legalFooterText });

    let transitionTimer = null;
    let collapseTimer = null;
    let openFrame = null;
    let scrollFrame = null;
    const clearTransition = () => {
      if (transitionTimer !== null) window.clearTimeout(transitionTimer);
      if (collapseTimer !== null) window.clearTimeout(collapseTimer);
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      transitionTimer = null;
      collapseTimer = null;
      openFrame = null;
      scrollFrame = null;
    };
    const followExpansion = (until) => {
      if (!control.classList.contains("is-open")) {
        scrollFrame = null;
        return;
      }
      const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
      const overflow = control.getBoundingClientRect().bottom + 16 - viewportBottom;
      if (overflow > 0) window.scrollBy({ top: overflow, left: 0, behavior: "auto" });
      if (performance.now() < until) {
        scrollFrame = window.requestAnimationFrame(() => followExpansion(until));
      } else {
        scrollFrame = null;
      }
    };
    const closePanel = ({ restoreFocus = false } = {}) => {
      if (panel.hidden) return;
      clearTransition();
      control.classList.remove("is-opening");
      control.classList.add("is-closing");
      toggle.setAttribute("aria-expanded", "false");
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      collapseTimer = window.setTimeout(() => {
        control.classList.remove("is-open");
        collapseTimer = null;
        transitionTimer = window.setTimeout(() => {
          panel.hidden = true;
          control.classList.remove("is-closing");
          transitionTimer = null;
        }, reducedMotion ? 0 : 340);
      }, reducedMotion ? 0 : 120);
      if (restoreFocus) toggle.focus();
    };
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const opening = toggle.getAttribute("aria-expanded") !== "true";
      if (!opening) {
        closePanel();
        return;
      }
      clearTransition();
      control.classList.remove("is-closing");
      control.classList.add("is-opening");
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      openFrame = window.requestAnimationFrame(() => {
        control.classList.remove("is-opening");
        control.classList.add("is-open");
        openFrame = null;
        const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        followExpansion(performance.now() + (reducedMotion ? 0 : 380));
      });
    });
    document.addEventListener("click", (event) => {
      if (!legalFooter.contains(event.target)) closePanel();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        closePanel({ restoreFocus: true });
      }
    });
  };
})();

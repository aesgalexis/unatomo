(function () {
  const getBasePrefix = () => (/^\/nfc(?:\/|$)/i.test(window.location.pathname) ? "/nfc" : "");
  const getCurrentLang = () => {
    const pathMatch = window.location.pathname.match(/^\/(?:nfc\/)?([a-z]{2})(?:\/|$)/i);
    const fromPath = pathMatch ? pathMatch[1].toLowerCase() : "";
    if (fromPath === "en") return "en";
    const fromHtml = (document.documentElement.lang || "").trim().toLowerCase();
    if (fromHtml === "en") return "en";
    return "es";
  };

  const lang = getCurrentLang();
  const basePrefix = getBasePrefix();
  const isPublicNfcPage =
    document.body.classList.contains("nfc-landing") ||
    document.body.classList.contains("nfc-public-page");
  const contactHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/contacto.html`
    : `${basePrefix}/${lang}/index.html#/contacto`;
  const whatsNewHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/novedades.html`
    : `${basePrefix}/${lang}/index.html#/novedades`;
  const tagsHref = isPublicNfcPage
    ? `${basePrefix}/${lang}/tags.html`
    : `${basePrefix}/${lang}/index.html#/tags`;
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  if (legalFooter.dataset.disclosureReady === "true") return;
  legalFooter.dataset.disclosureReady = "true";

  const year = new Date().getFullYear();
  const legalText =
    lang === "en"
      ? `\u00A9 ${year} UNATOMO CORE SL \u00B7 All rights reserved.`
      : `\u00A9 ${year} UNATOMO CORE SL \u00B7 Todos los derechos reservados.`;

  const nav = document.createElement("div");
  nav.className = "footer-nav-links";

  const links = lang === "en"
    ? [
        { href: whatsNewHref, label: "What\u2019s new" },
        { href: tagsHref, label: "Physical tags" },
        { href: contactHref, label: "Contact" }
      ]
    : [
        { href: whatsNewHref, label: "Novedades" },
        { href: tagsHref, label: "Tags f\u00edsicos" },
        { href: contactHref, label: "Contacto" }
      ];

  links.forEach(({ href, label }) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.textContent = label;
    nav.appendChild(anchor);
  });

  const privacyFooter = legalFooter.nextElementSibling?.classList.contains("footer-link")
    ? legalFooter.nextElementSibling
    : null;
  const privacyLink = privacyFooter?.querySelector("a") || null;

  legalFooter.textContent = "";
  legalFooter.classList.add("footer-disclosure");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "footer-disclosure-toggle";
  const toggleLabel = "Footer";
  toggle.setAttribute("aria-label", toggleLabel);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "footer-disclosure-panel");
  toggle.innerHTML = '<span class="footer-disclosure-icon" aria-hidden="true"></span>';

  const panel = document.createElement("div");
  panel.id = "footer-disclosure-panel";
  panel.className = "footer-disclosure-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", toggleLabel);
  panel.hidden = true;
  panel.appendChild(nav);

  const identity = document.createElement("div");
  identity.className = "footer-disclosure-identity";
  const brand = document.createElement("div");
  brand.className = "footer-disclosure-brand";
  brand.textContent = "UNATOMO/NFC";
  const tagline = document.createElement("p");
  tagline.className = "footer-disclosure-tagline";
  tagline.textContent = lang === "en"
    ? "We connect people, machines, and processes."
    : "Conectamos personas, máquinas y procesos.";
  const company = document.createElement("p");
  company.className = "footer-disclosure-company";
  company.append("Powered by ");
  const poweredByLink = document.createElement("a");
  poweredByLink.href = "/landing/nosotros/";
  poweredByLink.textContent = "people who like machines";
  company.appendChild(poweredByLink);
  company.append(".");
  identity.appendChild(brand);
  identity.appendChild(tagline);
  identity.appendChild(company);
  panel.appendChild(identity);

  const meta = document.createElement("div");
  meta.className = "footer-disclosure-meta";
  const creditsTitle = document.createElement("div");
  creditsTitle.className = "footer-disclosure-credits-title";
  creditsTitle.textContent = lang === "en"
    ? "Technology and credits"
    : "Tecnolog\u00eda y cr\u00e9ditos";

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
  technologyNote.textContent = lang === "en"
    ? "Developed using tools from OpenAI Codex. Authentication, data, and storage on Google Firebase; code and publishing with GitHub."
    : "Desarrollado con herramientas de OpenAI Codex. Autenticaci\u00f3n, datos y almacenamiento sobre Firebase de Google; c\u00f3digo y publicaci\u00f3n con GitHub.";

  meta.appendChild(creditsTitle);
  meta.appendChild(technologyLinks);
  meta.appendChild(technologyNote);

  if (privacyLink) {
    privacyLink.classList.add("footer-disclosure-privacy");
    const privacyRow = document.createElement("p");
    privacyRow.className = "footer-disclosure-privacy-row";
    privacyRow.appendChild(privacyLink);
    identity.appendChild(privacyRow);
    privacyFooter.remove();
  }

  const legal = document.createElement("p");
  legal.className = "footer-disclosure-legal";
  legal.textContent = legalText;
  identity.appendChild(legal);
  panel.appendChild(meta);

  const control = document.createElement("div");
  control.className = "footer-disclosure-control";
  control.appendChild(toggle);
  control.appendChild(panel);

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

  const scrollToDocumentEnd = () => {
    const documentHeight = Math.max(
      document.documentElement?.scrollHeight || 0,
      document.body?.scrollHeight || 0
    );
    window.scrollTo({ top: documentHeight, left: 0, behavior: "auto" });
  };

  const followExpansion = (until) => {
    if (!control.classList.contains("is-open")) {
      scrollFrame = null;
      return;
    }
    const isMobileViewport = window.matchMedia?.("(max-width: 768px)").matches;
    if (isMobileViewport) {
      scrollToDocumentEnd();
    } else {
      const viewportBottom = window.innerHeight || document.documentElement.clientHeight;
      const overflow = control.getBoundingClientRect().bottom + 16 - viewportBottom;
      if (overflow > 0) window.scrollBy({ top: overflow, left: 0, behavior: "auto" });
    }
    if (performance.now() < until) {
      scrollFrame = window.requestAnimationFrame(() => followExpansion(until));
    } else if (isMobileViewport) {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollToDocumentEnd();
        scrollFrame = null;
      });
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

  legalFooter.appendChild(control);
})();

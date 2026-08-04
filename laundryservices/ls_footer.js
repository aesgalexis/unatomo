(() => {
  const legalFooter = document.getElementById("legal-footer");
  if (!legalFooter) return;

  const COPY = {
    es: {
      tagline: "Conectamos personas, máquinas y procesos.",
      contact: "Contacto",
      email: "Correo electrónico",
      phone: "Teléfono",
      hours: "De lunes a viernes, de 09:00 a 15:00 (Horario de España / CET).",
      address: "07440 Muro, Mallorca, España",
      hoursLabel: "Horario",
      addressLabel: "Dirección",
      legal: "UNATOMO CORE SL · Todos los derechos reservados.",
      toggle: "Abrir pie de página",
      panel: "Pie de página de Laundry Services",
    },
    en: {
      tagline: "We connect people, machines, and processes.",
      contact: "Contact",
      email: "Email",
      phone: "Phone",
      hours: "Monday to Friday, from 09:00 to 15:00 (Spain time / CET).",
      address: "07440 Muro, Mallorca, Spain",
      hoursLabel: "Opening hours",
      addressLabel: "Address",
      legal: "UNATOMO CORE SL · All rights reserved.",
      toggle: "Open footer",
      panel: "Laundry Services footer",
    },
    it: {
      tagline: "Connettiamo persone, macchine e processi.",
      contact: "Contatto",
      email: "Email",
      phone: "Telefono",
      hours: "Dal lunedì al venerdì, dalle 09:00 alle 15:00 (Orario della Spagna / CET).",
      address: "07440 Muro, Maiorca, Spagna",
      hoursLabel: "Orari",
      addressLabel: "Indirizzo",
      legal: "UNATOMO CORE SL · Tutti i diritti riservati.",
      toggle: "Apri il piè di pagina",
      panel: "Piè di pagina di Laundry Services",
    },
    el: {
      tagline: "Συνδέουμε ανθρώπους, μηχανές και διαδικασίες.",
      contact: "Επικοινωνία",
      email: "Email",
      phone: "Τηλέφωνο",
      hours: "Δευτέρα έως Παρασκευή, 09:00 έως 15:00 (Ώρα Ισπανίας / CET).",
      address: "07440 Muro, Μαγιόρκα, Ισπανία",
      hoursLabel: "Ωράριο",
      addressLabel: "Διεύθυνση",
      legal: "UNATOMO CORE SL · Με επιφύλαξη παντός δικαιώματος.",
      toggle: "Άνοιγμα υποσέλιδου",
      panel: "Υποσέλιδο Laundry Services",
    },
  };

  const getLanguage = () => {
    const lang = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    return COPY[lang] ? lang : "es";
  };

  const privacyFooter = Array.from(legalFooter.parentElement?.children || [])
    .find((child) => child !== legalFooter && child.classList.contains("footer-link")) || null;
  const privacyLink = privacyFooter?.querySelector("a") || null;

  legalFooter.textContent = "";
  legalFooter.classList.add("ls-footer-disclosure");

  const control = document.createElement("div");
  control.className = "ls-footer-disclosure-control";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ls-footer-disclosure-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "ls-footer-disclosure-panel");
  toggle.innerHTML = '<span class="ls-footer-disclosure-icon" aria-hidden="true"></span>';

  const panel = document.createElement("div");
  panel.id = "ls-footer-disclosure-panel";
  panel.className = "ls-footer-disclosure-panel";
  panel.setAttribute("role", "region");
  panel.hidden = true;

  const identity = document.createElement("div");
  identity.className = "ls-footer-disclosure-identity";

  const tagline = document.createElement("p");
  tagline.className = "ls-footer-disclosure-tagline";

  const powered = document.createElement("p");
  powered.className = "ls-footer-disclosure-powered";
  powered.append("Powered by ");
  const poweredLink = document.createElement("a");
  poweredLink.href = "/landing/nosotros/";
  poweredLink.textContent = "people who like machines";
  powered.append(poweredLink, ".");

  const privacyRow = document.createElement("p");
  privacyRow.className = "ls-footer-disclosure-privacy-row";
  if (privacyLink) {
    privacyLink.classList.add("ls-footer-disclosure-privacy");
    privacyRow.appendChild(privacyLink);
    privacyFooter.remove();
  }

  const legal = document.createElement("p");
  legal.className = "ls-footer-disclosure-legal";

  identity.append(tagline, powered);
  if (privacyLink) identity.appendChild(privacyRow);
  identity.appendChild(legal);

  const meta = document.createElement("div");
  meta.className = "ls-footer-disclosure-meta";

  const contactTitle = document.createElement("p");
  contactTitle.className = "ls-footer-disclosure-contact-title";
  const contactList = document.createElement("div");
  contactList.className = "ls-footer-disclosure-contact-list";

  const createContactItem = ({ href = "", iconPath, text = "" }) => {
    const item = document.createElement(href ? "a" : "div");
    item.className = "ls-footer-disclosure-contact-item";
    if (href) item.href = href;
    const icon = document.createElement("span");
    icon.className = "ls-footer-disclosure-contact-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="${iconPath}"></path></svg>`;
    const value = document.createElement("span");
    value.textContent = text;
    item.append(icon, value);
    contactList.appendChild(item);
    return { item, value };
  };

  const emailItem = createContactItem({
    href: "mailto:info@unatomo.com",
    iconPath: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v.01L12 13 20 6.01V6H4zm0 12h16V8l-8 7-8-7v10z",
    text: "info@unatomo.com",
  });
  const phoneItem = createContactItem({
    href: "tel:+34871252049",
    iconPath: "M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a2 2 0 01-2 2A17 17 0 013 5a2 2 0 012-2h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.22z",
    text: "+34 871 25 20 49",
  });
  const hoursItem = createContactItem({
    iconPath: "M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm0 18a8 8 0 118-8 8.009 8.009 0 01-8 8zm.5-13h-1v6l5 3 .5-.86-4.5-2.64z",
  });
  const addressItem = createContactItem({
    href: "https://www.google.com/maps/search/?api=1&query=07440%20Muro%2C%20Mallorca%2C%20Espa%C3%B1a",
    iconPath: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  });
  addressItem.item.target = "_blank";
  addressItem.item.rel = "noopener";

  meta.append(contactTitle, contactList);
  panel.append(identity, meta);
  control.append(toggle, panel);
  legalFooter.appendChild(control);

  const render = () => {
    const copy = COPY[getLanguage()];
    toggle.setAttribute("aria-label", copy.toggle);
    panel.setAttribute("aria-label", copy.panel);
    tagline.textContent = copy.tagline;
    contactTitle.textContent = copy.contact;
    emailItem.item.setAttribute("aria-label", copy.email);
    phoneItem.item.setAttribute("aria-label", copy.phone);
    hoursItem.item.setAttribute("aria-label", copy.hoursLabel);
    addressItem.item.setAttribute("aria-label", copy.addressLabel);
    hoursItem.value.textContent = copy.hours;
    addressItem.value.textContent = copy.address;
    legal.textContent = `© ${new Date().getFullYear()} ${copy.legal}`;
  };

  let closeTimer = null;
  let scrollFrame = null;

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
    scrollToDocumentEnd();
    if (performance.now() < until) {
      scrollFrame = window.requestAnimationFrame(() => followExpansion(until));
    } else {
      scrollFrame = window.requestAnimationFrame(() => {
        scrollToDocumentEnd();
        scrollFrame = null;
      });
    }
  };

  const close = ({ restoreFocus = false } = {}) => {
    if (panel.hidden) return;
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    scrollFrame = null;
    control.classList.remove("is-open");
    control.classList.add("is-closing");
    toggle.setAttribute("aria-expanded", "false");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer = window.setTimeout(() => {
      panel.hidden = true;
      control.classList.remove("is-closing");
      closeTimer = null;
    }, reducedMotion ? 0 : 180);
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const opening = toggle.getAttribute("aria-expanded") !== "true";
    if (!opening) {
      close();
      return;
    }
    if (closeTimer !== null) window.clearTimeout(closeTimer);
    panel.hidden = false;
    control.classList.remove("is-closing");
    toggle.setAttribute("aria-expanded", "true");
    window.requestAnimationFrame(() => {
      control.classList.add("is-open");
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      followExpansion(performance.now() + (reducedMotion ? 0 : 420));
    });
  });

  document.addEventListener("click", (event) => {
    if (!legalFooter.contains(event.target)) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      close({ restoreFocus: true });
    }
  });

  document.addEventListener("app:language-change", render);
  render();
})();

import { HELP_SECTIONS } from "./helpContent.js";

const getCopy = (value, lang) => value?.[lang] || value?.es || "";

const createSectionBody = (section, lang) => {
  const fragment = document.createDocumentFragment();
  if (section.items) {
    const list = document.createElement("dl");
    list.className = "dashboard-help-definitions";
    section.items[lang].forEach(([term, description]) => {
      const item = document.createElement("div");
      const title = document.createElement("dt");
      const body = document.createElement("dd");
      title.textContent = term;
      body.textContent = description;
      item.append(title, body);
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }
  if (section.bullets) {
    const list = document.createElement("ul");
    section.bullets[lang].forEach((copy) => {
      const item = document.createElement("li");
      item.textContent = copy;
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }
  if (section.steps) {
    const list = document.createElement("ol");
    list.className = "dashboard-help-steps";
    section.steps[lang].forEach((copy) => {
      const item = document.createElement("li");
      item.textContent = copy;
      list.appendChild(item);
    });
    fragment.appendChild(list);
  }
  if (section.note) {
    const note = document.createElement("aside");
    note.className = "dashboard-help-note";
    note.textContent = getCopy(section.note, lang);
    fragment.appendChild(note);
  }
  return fragment;
};

export const renderHelpDashboardView = (container, options = {}) => {
  const lang = options.isEnglish ? "en" : "es";
  const headerContainer = options.headerContainer;
  if (headerContainer) {
    const header = document.createElement("div");
    header.className = "global-registry-header dashboard-help-header";
    const title = document.createElement("h3");
    title.textContent = lang === "en" ? "User manual" : "Manual de usuario";
    header.appendChild(title);
    if (options.loadingElement) header.appendChild(options.loadingElement);
    headerContainer.appendChild(header);
  }

  const view = document.createElement("div");
  view.className = "dashboard-help-view";
  const tree = document.createElement("nav");
  tree.className = "dashboard-help-tree";
  tree.setAttribute("aria-label", lang === "en" ? "Manual chapters" : "Capítulos del manual");
  const treeTitle = document.createElement("strong");
  treeTitle.textContent = lang === "en" ? "Contents" : "Contenido";
  tree.appendChild(treeTitle);

  const main = document.createElement("article");
  main.className = "dashboard-help-content";
  const hero = document.createElement("header");
  hero.className = "dashboard-help-hero";
  hero.innerHTML = lang === "en"
    ? "<p class=\"dashboard-help-eyebrow\">UNATOMO/NFC</p><h1>User manual</h1><p>Learn how to organise machines, record operational work and give each person the right access.</p>"
    : "<p class=\"dashboard-help-eyebrow\">UNATOMO/NFC</p><h1>Manual de usuario</h1><p>Aprende a organizar máquinas, registrar el trabajo operativo y dar a cada persona el acceso adecuado.</p>";

  const mobileJump = document.createElement("label");
  mobileJump.className = "dashboard-help-jump";
  const jumpLabel = document.createElement("span");
  jumpLabel.textContent = lang === "en" ? "Go to chapter" : "Ir al capítulo";
  const select = document.createElement("select");
  select.setAttribute("aria-label", jumpLabel.textContent);
  mobileJump.append(jumpLabel, select);
  main.append(hero, mobileJump);

  HELP_SECTIONS.forEach((section, index) => {
    const title = getCopy(section.title, lang);
    const link = document.createElement("a");
    link.href = `#manual-${section.id}`;
    link.textContent = title;
    if (index === 0) link.setAttribute("aria-current", "true");
    tree.appendChild(link);

    const option = document.createElement("option");
    option.value = `manual-${section.id}`;
    option.textContent = title;
    select.appendChild(option);

    const sectionElement = document.createElement("section");
    sectionElement.id = `manual-${section.id}`;
    sectionElement.className = "dashboard-help-section";
    sectionElement.tabIndex = -1;
    const heading = document.createElement("h2");
    heading.textContent = title;
    const intro = document.createElement("p");
    intro.className = "dashboard-help-intro";
    intro.textContent = getCopy(section.intro, lang);
    sectionElement.append(heading, intro, createSectionBody(section, lang));
    main.appendChild(sectionElement);
  });

  const goToSection = (id, updateHash = true) => {
    const target = view.querySelector(`#${CSS.escape(id)}`);
    if (!target) return;
    target.scrollIntoView({ behavior: updateHash ? "smooth" : "auto", block: "start" });
    target.focus({ preventScroll: true });
    if (updateHash) {
      const nextUrl = options.standalone
        ? `${location.pathname}${location.search}#${id}`
        : `${location.pathname}${location.search}#/ayuda?capitulo=${id.replace(/^manual-/, "")}`;
      history.replaceState(null, "", nextUrl);
    }
  };
  tree.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#manual-']");
    if (!link) return;
    event.preventDefault();
    goToSection(link.getAttribute("href").slice(1));
  });
  select.addEventListener("change", () => goToSection(select.value));
  view.append(tree, main);
  container.appendChild(view);

  const requested = options.standalone
    ? location.hash.replace(/^#manual-/, "")
    : new URLSearchParams((location.hash.split("?")[1] || "")).get("capitulo");
  if (requested) requestAnimationFrame(() => goToSection(`manual-${requested}`, false));
};

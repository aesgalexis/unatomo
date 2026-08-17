export const getPublicSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .split("?", 1)[0]
    .trim()
    .toLowerCase();

export const isPublicSectionHash = () =>
  ["novedades", "tags", "contacto"].includes(getPublicSectionFromHash());

export const getDashboardInternalView = () => {
  const section = getPublicSectionFromHash();
  const normalizedSection = {
    users: "usuarios",
    suggestions: "sugerencias",
    tareas: "todo",
    tasks: "todo",
    statistics: "estadisticas",
    notifications: "notificaciones",
    privacy: "privacidad",
    help: "ayuda",
  }[section] || section;
  return ["registro", "galeria", "estadisticas", "usuarios", "sugerencias", "todo", "notificaciones", "privacidad", "ayuda"].includes(normalizedSection)
    ? normalizedSection
    : "dashboard";
};

export const isMobileViewport = () =>
  !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

export const scrollSuggestionsViewToTop = () => {
  try {
    window.sessionStorage.removeItem("unatomo:suggestions-scroll-top");
  } catch {}
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
};

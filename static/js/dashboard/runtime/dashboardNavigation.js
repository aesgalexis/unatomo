export const getPublicSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();

export const isPublicSectionHash = () =>
  ["faqs", "tags", "contacto", "novedades"].includes(getPublicSectionFromHash());

export const getDashboardInternalView = () => {
  const section = getPublicSectionFromHash();
  return ["registro", "sugerencias", "todo"].includes(section)
    ? section
    : "dashboard";
};

export const isMobileViewport = () =>
  !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

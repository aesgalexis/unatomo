export const getPublicSectionFromHash = () =>
  (window.location.hash || "")
    .replace(/^#/, "")
    .replace(/^\/+/, "")
    .trim()
    .toLowerCase();

export const isPublicSectionHash = () =>
  ["novedades", "tags", "contacto"].includes(getPublicSectionFromHash());

export const getDashboardInternalView = () => {
  const section = getPublicSectionFromHash();
  return ["registro", "galeria", "sugerencias", "todo"].includes(section)
    ? section
    : "dashboard";
};

export const isMobileViewport = () =>
  !!(window.matchMedia && window.matchMedia("(max-width: 768px)").matches);

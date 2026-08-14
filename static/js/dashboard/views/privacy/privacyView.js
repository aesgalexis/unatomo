const privacyDocumentCache = new Map();

const loadPrivacySections = async (lang) => {
  if (!privacyDocumentCache.has(lang)) {
    const request = fetch(`/nfc/${lang}/privacidad.html`, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`privacy_${response.status}`);
        return response.text();
      })
      .then((html) => {
        const documentCopy = new DOMParser().parseFromString(html, "text/html");
        const main = documentCopy.querySelector("main.page-shell");
        if (!main) throw new Error("privacy_content_missing");
        return [...main.querySelectorAll(":scope > .page-section")];
      });
    privacyDocumentCache.set(lang, request);
  }
  return privacyDocumentCache.get(lang);
};

export const renderPrivacyDashboardView = (container, options = {}) => {
  const isEnglish = !!options.isEnglish;
  const lang = isEnglish ? "en" : "es";
  const headerContainer = options.headerContainer;

  if (headerContainer) {
    const header = document.createElement("div");
    header.className = "global-registry-header dashboard-privacy-header";
    const title = document.createElement("h3");
    title.textContent = isEnglish ? "Privacy" : "Privacidad";
    header.appendChild(title);
    if (options.loadingElement) header.appendChild(options.loadingElement);
    headerContainer.appendChild(header);
  }

  const view = document.createElement("article");
  view.className = "dashboard-privacy-view";
  const back = document.createElement("a");
  back.className = "dashboard-privacy-back";
  back.href = "#/dashboard";
  back.textContent = isEnglish ? "← Back to dashboard" : "← Volver al dashboard";
  const status = document.createElement("p");
  status.className = "dashboard-privacy-status";
  status.textContent = isEnglish ? "Loading privacy policy…" : "Cargando política de privacidad…";
  view.append(back, status);
  container.appendChild(view);

  loadPrivacySections(lang)
    .then((sections) => {
      if (!view.isConnected || !/^#\/(?:privacidad|privacy)$/i.test(window.location.hash)) return;
      status.remove();
      sections.forEach((section) => view.appendChild(section.cloneNode(true)));
    })
    .catch(() => {
      if (!view.isConnected) return;
      status.classList.add("is-error");
      status.textContent = isEnglish
        ? "The privacy policy could not be loaded."
        : "No se pudo cargar la política de privacidad.";
    });
};

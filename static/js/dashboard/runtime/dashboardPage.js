export const createDashboardPage = ({ getAppBasePrefix, getCurrentLang, setSavedLang }) => {
  const appBasePrefix = getAppBasePrefix();
  const lang = getCurrentLang();
  const localizedPath = (esPath, enPath) =>
    `${appBasePrefix || ""}/${lang === "en" ? enPath : esPath}`;

  try {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  } catch {}

  return {
    appBasePrefix,
    lang,
    mount: document.getElementById("dashboard-mount"),
    qrPrintHref: localizedPath("es/impresion-qr.html", "en/qr-print.html"),
    redirectToEntry: () => {
      setSavedLang(lang);
      window.location.href = `${appBasePrefix || ""}/`;
    }
  };
};

export const withDashboardTimeout = (promise, ms = 6000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });

export const createDashboardStatusLabels = (t) => ({
  operativa: t("dashboard.statusByValue.operativa", "Operativo"),
  fuera_de_servicio: t("dashboard.statusByValue.fuera_de_servicio", "Fuera de servicio"),
  desconectada: t("dashboard.statusByValue.desconectada", "Desconectada")
});

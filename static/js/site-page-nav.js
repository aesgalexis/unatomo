import { mountNfcMinimalPageNav } from "/static/js/nfc/minimalPageNav.js";

const pathname = window.location.pathname.replace(/\/{2,}/g, "/");
const isAbsoluteRoot = pathname === "/" || pathname === "/index.html";
const isLocalizedCorporateHome = /^\/(?:es|en|it|el)(?:\/index\.html)?\/?$/.test(pathname);

if (!isAbsoluteRoot && !isLocalizedCorporateHome) {
  const existingNav = document.querySelector(
    ".nfc-minimal-page-nav, .ls-minimal-page-nav, .studio-page-nav"
  );

  if (!existingNav) {
    const stylesheetHref = "/static/css/components/nfc-minimal-page-nav.css";
    if (!document.querySelector(`link[href="${stylesheetHref}"]`)) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = stylesheetHref;
      document.head.appendChild(stylesheet);
    }

    const copy = {
      es: { back: "Volver", top: "Arriba" },
      en: { back: "Back", top: "Top" },
      it: { back: "Indietro", top: "In alto" },
      el: { back: "Πίσω", top: "Επάνω" },
    };
    const language = (document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    const labels = copy[language] || copy.es;

    const inferBackHref = () => {
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length <= 1) return "/";

      const localePattern = /^(es|en|it|el)$/;
      if (localePattern.test(segments[0])) return `/${segments[0]}/`;

      if (["laundryservices", "studio", "nfc"].includes(segments[0])) {
        if (localePattern.test(segments[1] || "")) {
          return segments.length === 2 ? `/${segments[1]}/` : `/${segments[0]}/${segments[1]}/`;
        }
        return `/${segments[0]}/`;
      }

      return `/${segments.slice(0, -1).join("/")}/`;
    };

    const explicitBackHref = (document.body.dataset.backHref || "").trim();
    const useHistory = (document.body.dataset.backMode || "").trim() === "history";
    mountNfcMinimalPageNav({
      backLabel: labels.back,
      topLabel: labels.top,
      backHref: explicitBackHref || (useHistory ? "" : inferBackHref()),
    });
  }
}

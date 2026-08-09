import { getCurrentLang } from "/static/js/site/locale.js";
import { mountNfcMinimalPageNav } from "/static/js/nfc/minimalPageNav.js";

const mount = document.getElementById("page-nav-mount");
if (mount) mount.replaceChildren();

const lang = getCurrentLang();
mountNfcMinimalPageNav({
  backLabel: lang === "en" ? "Back" : "Volver",
  topLabel: lang === "en" ? "Top" : "Arriba",
  backHref: (document.body.dataset.backHref || "").trim()
});

import {readFile} from "node:fs/promises";
import parse5 from "parse5";

const SITE = "https://unatomo.com";
const LANGS = ["es", "en", "it", "el"];
const ROUTES = {
  home: {es: "/es/", en: "/en/", it: "/it/", el: "/el/"},
  about: {es: "/es/nosotros/", en: "/en/about/", it: "/it/chi-siamo/", el: "/el/schetika-me-emas/"},
  contact: {es: "/es/contacto/", en: "/en/contact/", it: "/it/contatto/", el: "/el/epikoinonia/"},
  privacy: {es: "/es/privacidad/", en: "/en/privacy/", it: "/it/privacy/", el: "/el/aporrito/"},
};
const failures = [];
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const walk = (node, callback) => { callback(node); for (const child of node.childNodes || []) walk(child, callback); };
const findAll = (node, predicate) => { const matches = []; walk(node, (item) => { if (predicate(item)) matches.push(item); }); return matches; };

for (const [type, translations] of Object.entries(ROUTES)) {
  for (const lang of LANGS) {
    const route = translations[lang];
    const source = await readFile(`${route.slice(1)}index.html`, "utf8");
    const document = parse5.parse(source);
    const html = document.childNodes.find((node) => node.tagName === "html");
    const head = html?.childNodes.find((node) => node.tagName === "head");
    const body = html?.childNodes.find((node) => node.tagName === "body");
    const headNodes = head ? findAll(head, () => true) : [];
    const bodyNodes = body ? findAll(body, () => true) : [];
    if (!document.childNodes.some((node) => node.nodeName === "#documentType")) failures.push(`${route}: missing doctype.`);
    if (attr(html, "lang") !== lang) failures.push(`${route}: incorrect language.`);
    const canonical = headNodes.find((node) => node.tagName === "link" && attr(node, "rel") === "canonical");
    if (attr(canonical, "href") !== `${SITE}${route}`) failures.push(`${route}: incorrect canonical.`);
    for (const target of LANGS) {
      const alternate = headNodes.find((node) => node.tagName === "link" && attr(node, "hreflang") === target);
      if (attr(alternate, "href") !== `${SITE}${translations[target]}`) failures.push(`${route}: incorrect ${target} alternate.`);
    }
    const xDefault = headNodes.find((node) => node.tagName === "link" && attr(node, "hreflang") === "x-default");
    const expectedDefault = type === "home" ? `${SITE}/` : `${SITE}${translations.es}`;
    if (attr(xDefault, "href") !== expectedDefault) failures.push(`${route}: incorrect x-default.`);
    if (bodyNodes.filter((node) => node.tagName === "h1").length !== 1) failures.push(`${route}: expected one h1.`);
    const languageClass = type === "home" ? "landing-lang-option" : "lang-option";
    if (bodyNodes.filter((node) => node.tagName === "a" && (attr(node, "class") || "").includes(languageClass)).length !== 4) failures.push(`${route}: expected four language links.`);
    if (/ld_(?:i18n|lang-toggle|claim-loop|about_i18n|nosotros|privacidad)\.js|app:language-change|unatomoI18n/u.test(source)) failures.push(`${route}: legacy client-side localization found.`);
  }
}

for (const [file, target] of [["index.html", "/es/"], ["landing/nosotros/index.html", ROUTES.about.es], ["landing/contacto/index.html", ROUTES.contact.es], ["landing/ld_privacidad.html", ROUTES.privacy.es]]) {
  const source = await readFile(file, "utf8");
  if (!source.includes('content="noindex,follow"') || !source.includes(`url=${target}`)) failures.push(`${file}: expected noindex compatibility redirect to ${target}.`);
}
if (failures.length) {
  console.error("Localized landing check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("OK: sixteen physical landing pages, reciprocal SEO metadata, and compatibility redirects verified.");

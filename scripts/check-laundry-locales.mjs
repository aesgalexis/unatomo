import {access, readFile} from "node:fs/promises";
import path from "node:path";
import parse5 from "parse5";

const SITE = "https://unatomo.com";
const LANGS = ["es", "en", "it", "el"];
const ROUTES = {
  es: {home: "", audit: "auditoria", support: "asistencia-tecnica", investments: "inversiones", automation: "automatizacion", machinery: "maquinaria-ocasion", spares: "recambios", contact: "contacto", privacy: "privacidad"},
  en: {home: "", audit: "technical-audit", support: "technical-support", investments: "investments", automation: "automation", machinery: "used-machinery", spares: "spare-parts", contact: "contact", privacy: "privacy"},
  it: {home: "", audit: "audit-tecnico", support: "assistenza-tecnica", investments: "investimenti", automation: "automazione", machinery: "macchinari-usati", spares: "ricambi", contact: "contatto", privacy: "privacy"},
  el: {home: "", audit: "technikos-elegchos", support: "techniki-ypostirixi", investments: "ependyseis", automation: "aftomatismoi", machinery: "metacheirismena-michanimata", spares: "antallaktika", contact: "epikoinonia", privacy: "aporrito"},
};
const routePath = (lang, page) => `/laundryservices/${lang}/${ROUTES[lang][page] ? `${ROUTES[lang][page]}/` : ""}`;
const failures = [];
const titles = new Set();
const walk = (node, callback) => {
  callback(node);
  for (const child of node.childNodes || []) walk(child, callback);
};
const findAll = (root, predicate) => {
  const matches = [];
  walk(root, (node) => { if (predicate(node)) matches.push(node); });
  return matches;
};
const attribute = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const nodeText = (node) => node?.nodeName === "#text" ? node.value || "" : (node?.childNodes || []).map(nodeText).join("");

for (const lang of LANGS) {
  for (const page of Object.keys(ROUTES[lang])) {
    const route = routePath(lang, page);
    const filename = path.resolve(`.${route}`, "index.html");
    try {
      await access(filename);
    } catch {
      failures.push(`${route}: missing index.html.`);
      continue;
    }
    const html = await readFile(filename, "utf8");
    const document = parse5.parse(html);
    const htmlNode = document.childNodes.find((node) => node.tagName === "html");
    const head = htmlNode?.childNodes.find((node) => node.tagName === "head");
    const body = htmlNode?.childNodes.find((node) => node.tagName === "body");
    const headNodes = head ? findAll(head, () => true) : [];
    const bodyNodes = body ? findAll(body, () => true) : [];
    const titleNode = headNodes.find((node) => node.tagName === "title");
    const descriptionNode = headNodes.find((node) => node.tagName === "meta" && attribute(node, "name") === "description");
    const canonicalNode = headNodes.find((node) => node.tagName === "link" && attribute(node, "rel") === "canonical");
    const title = nodeText(titleNode).trim();
    const description = attribute(descriptionNode, "content")?.trim();
    if (!document.childNodes.some((node) => node.nodeName === "#documentType")) failures.push(`${route}: missing doctype.`);
    if (!head || !body) failures.push(`${route}: invalid HTML structure.`);
    if (attribute(htmlNode, "lang") !== lang) failures.push(`${route}: incorrect html lang.`);
    if (!title) failures.push(`${route}: missing title.`);
    else if (titles.has(title)) failures.push(`${route}: duplicate title "${title}".`);
    else titles.add(title);
    if (!description) failures.push(`${route}: missing meta description.`);
    if (attribute(canonicalNode, "href") !== `${SITE}${route}`) failures.push(`${route}: missing self-canonical in head.`);
    for (const targetLang of LANGS) {
      const alternate = headNodes.find((node) => node.tagName === "link" && attribute(node, "hreflang") === targetLang);
      if (attribute(alternate, "href") !== `${SITE}${routePath(targetLang, page)}`) failures.push(`${route}: missing ${targetLang} hreflang in head.`);
    }
    const defaultAlternate = headNodes.find((node) => node.tagName === "link" && attribute(node, "hreflang") === "x-default");
    if (attribute(defaultAlternate, "href") !== `${SITE}${routePath("es", page)}`) {
      failures.push(`${route}: missing x-default hreflang in head.`);
    }
    if (!headNodes.some((node) => node.tagName === "script" && attribute(node, "type") === "application/ld+json")) failures.push(`${route}: missing structured data in head.`);
    if (bodyNodes.some((node) => node.tagName === "title" || (node.tagName === "meta" && ["description", "robots"].includes(attribute(node, "name"))) || (node.tagName === "link" && attribute(node, "rel") === "canonical"))) {
      failures.push(`${route}: SEO metadata found in body.`);
    }
    const headings = bodyNodes.filter((node) => node.tagName === "h1");
    if (headings.length !== 1) failures.push(`${route}: expected one h1, found ${headings.length}.`);
    if (page === "privacy" && !bodyNodes.some((node) => node.tagName === "article" && (attribute(node, "class") || "").split(/\s+/u).includes("legal-copy"))) {
      failures.push(`${route}: missing privacy article.`);
    }
    const pageNavScripts = bodyNodes.filter((node) => node.tagName === "script" && attribute(node, "src") === "/laundryservices/ls_page-nav.js");
    if (pageNavScripts.length !== 1) failures.push(`${route}: expected one Laundry Services page navigation script, found ${pageNavScripts.length}.`);
    if (bodyNodes.some((node) => node.tagName === "script" && (attribute(node, "src") || "").includes("/nfc/"))) {
      failures.push(`${route}: page navigation must not depend on NFC code.`);
    }
    const runtimeConfigScripts = headNodes.filter((node) =>
      node.tagName === "script" && attribute(node, "src") === "/static/js/config/runtime-config.js");
    const needsFirebase = page === "machinery" || page === "spares";
    if (runtimeConfigScripts.length !== (needsFirebase ? 1 : 0)) {
      failures.push(`${route}: Firebase runtime config must load only on data-backed public pages.`);
    }
    if (bodyNodes.some((node) => node.tagName === "script" &&
      (attribute(node, "src") || "").includes("ls_machine-add.js"))) {
      failures.push(`${route}: machinery admin editor must be loaded dynamically, not by public HTML.`);
    }
    const powered = bodyNodes.find((node) => node.tagName === "p" &&
      (attribute(node, "class") || "").split(/\s+/u).includes("ls-footer-disclosure-powered"));
    const poweredLink = powered ? findAll(powered, (node) => node.tagName === "a")[0] : null;
    if (nodeText(powered).trim() !== "Powered by people who like machines." ||
        attribute(poweredLink, "href") !== "/es/nosotros/") {
      failures.push(`${route}: winged-shoe credit must remain untranslated and link to /es/nosotros/.`);
    }
    const expectedBackHref = page === "home" ? "https://unatomo.com/" : routePath(lang, "home");
    if (attribute(body, "data-back-href") !== expectedBackHref) failures.push(`${route}: incorrect back destination.`);
    if (/â|Ã|Â|ï»¿|�/u.test(html)) failures.push(`${route}: possible mojibake detected.`);
    if (/(?:data-(?:i18n|home-i18n|detail-i18n|spares-i18n)|\/laundryservices\/i18n\/|app:language-change|unatomoI18n)/u.test(html)) {
      failures.push(`${route}: contains legacy client-side translation code.`);
    }
  }
}

if (failures.length) {
  console.error("Laundry Services locale check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("OK: 36 localized Laundry Services pages, translated routes and SEO alternates verified.");

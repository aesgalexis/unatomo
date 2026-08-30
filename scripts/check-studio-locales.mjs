import { readFile } from "node:fs/promises";
import parse5 from "parse5";

const SITE = "https://unatomo.com";
const LANGS = ["es", "en", "it", "el"];
const failures = [];

const attribute = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const walk = (node, callback) => {
  callback(node);
  for (const child of node.childNodes || []) walk(child, callback);
};
const findAll = (root, predicate) => {
  const matches = [];
  walk(root, (node) => { if (predicate(node)) matches.push(node); });
  return matches;
};

for (const lang of LANGS) {
  const route = `/studio/${lang}/`;
  const source = await readFile(`studio/${lang}/index.html`, "utf8");
  const document = parse5.parse(source);
  const html = document.childNodes.find((node) => node.tagName === "html");
  const head = html?.childNodes.find((node) => node.tagName === "head");
  const body = html?.childNodes.find((node) => node.tagName === "body");
  const headNodes = head ? findAll(head, () => true) : [];
  const bodyNodes = body ? findAll(body, () => true) : [];

  if (!document.childNodes.some((node) => node.nodeName === "#documentType")) failures.push(`${route}: missing doctype.`);
  if (attribute(html, "lang") !== lang) failures.push(`${route}: incorrect html lang.`);
  const canonical = headNodes.find((node) => node.tagName === "link" && attribute(node, "rel") === "canonical");
  if (attribute(canonical, "href") !== `${SITE}${route}`) failures.push(`${route}: incorrect canonical.`);
  for (const target of LANGS) {
    const alternate = headNodes.find((node) => node.tagName === "link" && attribute(node, "hreflang") === target);
    if (attribute(alternate, "href") !== `${SITE}/studio/${target}/`) failures.push(`${route}: incorrect ${target} alternate.`);
  }
  const xDefault = headNodes.find((node) => node.tagName === "link" && attribute(node, "hreflang") === "x-default");
  if (attribute(xDefault, "href") !== `${SITE}/studio/es/`) failures.push(`${route}: incorrect x-default.`);
  if (bodyNodes.filter((node) => node.tagName === "h1").length !== 1) failures.push(`${route}: expected one h1.`);
  if (bodyNodes.filter((node) => node.tagName === "a" && attribute(node, "hreflang")).length !== 4) failures.push(`${route}: expected four physical language links.`);
  if (bodyNodes.some((node) => node.tagName === "footer")) failures.push(`${route}: visible footer must be replaced by the Studio winged shoe.`);
  if (!bodyNodes.some((node) => node.tagName === "aside" && (attribute(node, "class") || "").split(/\s+/u).includes("studio-shoe"))) failures.push(`${route}: missing Studio winged shoe.`);
  if (bodyNodes.some((node) => attribute(node, "id") === "theme-toggle")) failures.push(`${route}: theme toggle must not be present.`);
  if (!bodyNodes.some((node) => attribute(node, "id") === "atom" && (attribute(node, "class") || "").split(/\s+/u).includes("studio-atom"))) failures.push(`${route}: missing Studio atom.`);
  if (bodyNodes.some((node) => (attribute(node, "class") || "").split(/\s+/u).includes("studio-system"))) failures.push(`${route}: legacy system illustration must not be present.`);
  if (!headNodes.some((node) => node.tagName === "script" && attribute(node, "type") === "application/ld+json")) failures.push(`${route}: missing structured data.`);
  if (/(?:data-i18n|app:language-change|unatomoI18n)/u.test(source)) failures.push(`${route}: client-side translation found.`);
  if (/â|Ã|Â|ï»¿|�/u.test(source)) failures.push(`${route}: possible mojibake.`);
}

const redirect = await readFile("studio/index.html", "utf8");
if (!redirect.includes('content="noindex,follow"') ||
    !redirect.includes("url=/studio/es/") ||
    !redirect.includes('location.replace("/studio/es/" + location.search + location.hash)')) {
  failures.push("/studio/: expected noindex redirect to /studio/es/.");
}

const viteConfig = await readFile("vite.config.mjs", "utf8");
for (const route of ["/studio", "/studio/"]) {
  if (!viteConfig.includes(`["${route}", "/studio/index.html"]`)) {
    failures.push(`${route}: missing clean directory route in Vite.`);
  }
}

if (failures.length) {
  console.error("Studio locale check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OK: four physical Studio pages, reciprocal SEO metadata and compatibility redirect verified.");

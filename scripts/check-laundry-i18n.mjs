import { readFile } from "node:fs/promises";
import vm from "node:vm";

const baseSandbox = () => ({
  window: {},
  document: {
    body: { dataset: {} },
    documentElement: { lang: "es" },
    title: "",
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    dispatchEvent: () => {},
  },
  navigator: { languages: ["es"], language: "es" },
  localStorage: { getItem: () => "es", setItem: () => {} },
  CustomEvent: class CustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  console,
});

async function readIifeDictionary(file, expression) {
  const source = await readFile(file, "utf8");
  const instrumented = source.replace(
    /\n\}\)\(\);\s*$/,
    `\n  globalThis.__laundryDictionary = ${expression};\n})();`
  );
  if (instrumented === source) throw new Error(`${file}: IIFE ending not found.`);
  const sandbox = baseSandbox();
  vm.runInNewContext(instrumented, sandbox, { filename: file });
  return sandbox.__laundryDictionary;
}

async function readModuleDictionary(file, expression) {
  const source = (await readFile(file, "utf8")).replace(/^export\s+/gm, "");
  const sandbox = baseSandbox();
  vm.runInNewContext(
    `${source}\nglobalThis.__laundryDictionary = ${expression};`,
    sandbox,
    { filename: file }
  );
  return sandbox.__laundryDictionary;
}

const flattenKeys = (value, prefix = "") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child) ?
      flattenKeys(child, path) : [path];
  });
};

const compareKeys = (label, dictionaries) => {
  const entries = Object.entries(dictionaries);
  const [baseLanguage, baseDictionary] = entries[0];
  const baseKeys = flattenKeys(baseDictionary).sort();
  entries.slice(1).forEach(([language, dictionary]) => {
    const keys = flattenKeys(dictionary).sort();
    const missing = baseKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !baseKeys.includes(key));
    if (missing.length || extra.length) {
      throw new Error(
        `${label} ${language} differs from ${baseLanguage}. ` +
        `Missing: ${missing.join(", ") || "-"}. Extra: ${extra.join(", ") || "-"}.`
      );
    }
  });
};

const common = await readIifeDictionary("laundryservices/i18n/common.js", "I18N");
const home = await readIifeDictionary("laundryservices/i18n/home-audit.js", "COPY");
const details = await readIifeDictionary(
  "laundryservices/i18n/service-details.js",
  "({ en: EN, it: IT, el: EL })"
);
const machinery = await readModuleDictionary("laundryservices/i18n/machinery.js", "META");
const spares = await readModuleDictionary(
  "laundryservices/i18n/spare-parts.js",
  "translations"
);

compareKeys("common", common);
compareKeys("home-audit", home);
compareKeys("machinery", machinery);
compareKeys("spare-parts", spares);
["investment", "automation"].forEach((page) => {
  compareKeys(`service-details:${page}`, Object.fromEntries(
    Object.entries(details).map(([language, pages]) => [language, pages[page]])
  ));
});

console.log("OK: Laundry Services i18n keys match across supported languages.");

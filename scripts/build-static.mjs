import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

// Keep this manifest deliberately explicit. The repository contains source,
// documentation, deployment configuration and Firebase Functions that must
// never be part of the GitHub Pages artifact.
const PUBLIC_FILES = [
  ".nojekyll",
  "404.html",
  "CNAME",
  "index.html",
  "robots.txt",
  "sitemap.xml",
  "ssl-simulator.html",
  "styles.css"
];

const PUBLIC_DIRECTORIES = [
  "en",
  "es",
  "landing",
  "laundry",
  "laundryservices",
  "nfc",
  "static"
];

// These files are not public site resources. The widget module and stylesheet
// remain public because the Laundry Services home page imports them at runtime.
const PUBLIC_EXCLUDED_PATHS = new Set([
  "laundryservices/ls_atom-widget/ls_demo.html",
  "static/data/nfc-backup-status.json"
]);

const toRelativePath = (filePath) =>
  path.relative(ROOT, filePath).split(path.sep).join("/");

const shouldCopy = (filePath) => !PUBLIC_EXCLUDED_PATHS.has(toRelativePath(filePath));

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const file of PUBLIC_FILES) {
  const source = path.join(ROOT, file);
  const destination = path.join(DIST, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

for (const directory of PUBLIC_DIRECTORIES) {
  const source = path.join(ROOT, directory);
  const destination = path.join(DIST, directory);
  await cp(source, destination, {
    recursive: true,
    filter: shouldCopy
  });
}

console.log("dist/ listo (artefacto estatico publico).");

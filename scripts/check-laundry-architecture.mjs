import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const root = resolve("laundryservices");
const backendRoot = resolve("firebase/functions/src/laundry");
const MAX_EXECUTABLE_LINES = 500;
const MAX_EXECUTABLE_BYTES = 22_000;
const MAX_BACKEND_LINES = 300;
const MAX_BACKEND_BYTES = 16_000;
const MAX_STYLESHEET_BYTES = 24_000;
const FIREBASE_BROWSER_VERSION = "12.16.0";
const forbiddenPublicData = [
  "recambios/catalogo-maquinas.json",
  "ls_recambios/ls_brand-list.js",
];
const forbiddenLegacyFiles = [
  "i18n/common.js",
  "i18n/home-audit.js",
  "i18n/service-details.js",
  "i18n/machinery.js",
  "i18n/spare-parts.js",
  "ls_i18n.js",
  "ls_home-i18n.js",
  "ls_detail-i18n.js",
  "recambios/recambios-i18n.js",
  "ls_maquinaria/ls_machine-copy.js",
  "ls_maquinaria/ls_machine-images.js",
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const files = await walk(root);
const relativeFiles = new Set(files.map((file) => relative(root, file).split(sep).join("/")));
const failures = forbiddenPublicData
  .filter((file) => relativeFiles.has(file))
  .map((file) => `${file}: catalogue data must live in Firestore, not in the public frontend.`);
forbiddenLegacyFiles
  .filter((file) => relativeFiles.has(file))
  .forEach((file) => failures.push(`${file}: legacy duplicate module must not be restored.`));

for (const file of files.filter((path) => path.endsWith(".js"))) {
  const relativePath = relative(root, file).split(sep).join("/");
  const source = await readFile(file, "utf8");
  const firebaseVersions = [...source.matchAll(/firebasejs\/(\d+\.\d+\.\d+)/g)]
    .map((match) => match[1]);
  firebaseVersions.forEach((version) => {
    if (version !== FIREBASE_BROWSER_VERSION) {
      failures.push(`${relativePath}: Firebase ${version} differs from ${FIREBASE_BROWSER_VERSION}.`);
    }
  });
  const lines = source.split(/\r?\n/).length;
  const bytes = (await stat(file)).size;
  if (lines > MAX_EXECUTABLE_LINES) {
    failures.push(`${relativePath}: ${lines} lines exceeds the ${MAX_EXECUTABLE_LINES}-line module limit.`);
  }
  if (bytes > MAX_EXECUTABLE_BYTES) {
    failures.push(`${relativePath}: ${bytes} bytes exceeds the ${MAX_EXECUTABLE_BYTES}-byte module limit.`);
  }
}

for (const file of files.filter((path) => path.endsWith(".css"))) {
  const bytes = (await stat(file)).size;
  if (bytes > MAX_STYLESHEET_BYTES) {
    const relativePath = relative(root, file).split(sep).join("/");
    failures.push(`${relativePath}: ${bytes} bytes exceeds the stylesheet module limit.`);
  }
}

const backendFiles = await walk(backendRoot);
for (const file of backendFiles.filter((path) => path.endsWith(".ts"))) {
  const relativePath = relative(backendRoot, file).split(sep).join("/");
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/).length;
  const bytes = (await stat(file)).size;
  if (lines > MAX_BACKEND_LINES || bytes > MAX_BACKEND_BYTES) {
    failures.push(
      `functions/${relativePath}: ${lines} lines and ${bytes} bytes exceeds the Laundry backend module limit.`
    );
  }
}

if (failures.length) {
  console.error("Laundry Services architecture check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OK: Laundry Services module boundaries and Firestore catalogue ownership verified.");

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const root = resolve("laundryservices");
const MAX_EXECUTABLE_LINES = 500;
const MAX_EXECUTABLE_BYTES = 22_000;
const DATA_MODULE_PATTERN = /(?:i18n|copy)\.js$/;
const forbiddenPublicData = [
  "recambios/catalogo-maquinas.json",
  "ls_recambios/ls_brand-list.js",
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

for (const file of files.filter((path) => path.endsWith(".js"))) {
  const relativePath = relative(root, file).split(sep).join("/");
  if (DATA_MODULE_PATTERN.test(relativePath)) continue;
  const source = await readFile(file, "utf8");
  const lines = source.split(/\r?\n/).length;
  const bytes = (await stat(file)).size;
  if (lines > MAX_EXECUTABLE_LINES) {
    failures.push(`${relativePath}: ${lines} lines exceeds the ${MAX_EXECUTABLE_LINES}-line module limit.`);
  }
  if (bytes > MAX_EXECUTABLE_BYTES) {
    failures.push(`${relativePath}: ${bytes} bytes exceeds the ${MAX_EXECUTABLE_BYTES}-byte module limit.`);
  }
}

if (failures.length) {
  console.error("Laundry Services architecture check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("OK: Laundry Services module boundaries and Firestore catalogue ownership verified.");

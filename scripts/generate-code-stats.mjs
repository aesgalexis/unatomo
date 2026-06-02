import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT = path.join(ROOT, "static", "data", "code-stats.json");

const IGNORE_DIRS = new Set([
  ".git",
  ".github",
  ".vscode",
  "dist",
  "docs",
  "node_modules"
]);

const IGNORE_FILES = new Set([
  "package-lock.json",
  path.join("static", "data", "code-stats.json")
]);

const CODE_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".rules",
  ".ts"
]);

const normalizeRelative = (filePath) =>
  path.relative(ROOT, filePath).split(path.sep).join("/");

const isIgnoredFile = (filePath) => {
  const relative = normalizeRelative(filePath);
  if (IGNORE_FILES.has(relative)) return true;
  return path.basename(filePath).startsWith(".");
};

const countLines = (content) => {
  if (!content) return 0;
  return content.split(/\r\n|\r|\n/).length;
};

const collectCodeFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...await collectCodeFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (isIgnoredFile(fullPath)) continue;
    if (!CODE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    files.push(fullPath);
  }

  return files;
};

const files = await collectCodeFiles(ROOT);
let totalLines = 0;

for (const file of files) {
  const content = await readFile(file, "utf8");
  totalLines += countLines(content);
}

const payload = {
  generatedAt: new Date().toISOString(),
  totalFiles: files.length,
  totalLines,
  countedExtensions: Array.from(CODE_EXTENSIONS).sort(),
  excludedDirectories: Array.from(IGNORE_DIRS).sort()
};

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(`code-stats.json generado: ${totalLines} lineas en ${files.length} archivos.`);

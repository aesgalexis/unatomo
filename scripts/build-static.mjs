import { rm, mkdir, readdir, stat, copyFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

const IGNORE_DIRS = new Set([".git", "node_modules", "dist", ".vscode"]);
const IGNORE_FILES = new Set(["package.json", "package-lock.json"]);

async function copyRecursive(src, dst) {
  const s = await stat(src);

  if (s.isDirectory()) {
    const name = path.basename(src);
    if (IGNORE_DIRS.has(name)) return;

    await mkdir(dst, { recursive: true });
    const entries = await readdir(src);
    for (const entry of entries) {
      await copyRecursive(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    const name = path.basename(src);
    if (IGNORE_FILES.has(name)) return;

    await mkdir(path.dirname(dst), { recursive: true });
    await copyFile(src, dst);
  }
}

await import("./generate-config.mjs");

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

await copyRecursive(ROOT, DIST);

console.log("✅ dist/ listo (copia estática completa).");

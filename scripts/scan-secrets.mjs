import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = ["static", "dist", "es", "index.html", "styles.css"];
const KEY_REGEX = /AIza[0-9A-Za-z_-]{20,}/g;

const hits = [];

const scanFile = async (filePath) => {
  try {
    const content = await readFile(filePath, "utf8");
    const matches = content.match(KEY_REGEX);
    if (matches) {
      matches.forEach((match) => hits.push({ filePath, match }));
    }
  } catch {
    // ignore unreadable files
  }
};

const scanPath = async (targetPath) => {
  try {
    const info = await stat(targetPath);
    if (info.isDirectory()) {
      const entries = await readdir(targetPath);
      for (const entry of entries) {
        await scanPath(path.join(targetPath, entry));
      }
    } else if (info.isFile()) {
      await scanFile(targetPath);
    }
  } catch {
    // ignore missing
  }
};

await Promise.all(
  TARGETS.map((target) => scanPath(path.join(ROOT, target)))
);

if (hits.length) {
  console.error("Se detectaron posibles API keys en el repo:");
  hits.forEach((hit) => {
    console.error(`- ${hit.filePath}: ${hit.match}`);
  });
  process.exit(1);
} else {
  console.log("scan-secrets: OK");
}

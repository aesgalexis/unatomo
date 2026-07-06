import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const ROOT = process.cwd();
const KEY_REGEX = /AIza[0-9A-Za-z_-]{20,}/g;
const execFileAsync = promisify(execFile);

const hits = [];

const scanFile = async (relativePath) => {
  const filePath = path.join(ROOT, relativePath);
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

const listTrackedFiles = async () => {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "buffer",
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
};

const files = await listTrackedFiles();
await Promise.all(files.map((file) => scanFile(file)));

if (hits.length) {
  console.error("Se detectaron posibles API keys en el repo:");
  hits.forEach((hit) => {
    console.error(`- ${hit.filePath}: ${hit.match}`);
  });
  process.exit(1);
} else {
  console.log("scan-secrets: OK");
}

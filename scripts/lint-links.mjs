import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exts = new Set([".html", ".js", ".mjs", ".css"]);
const ignoreDirs = new Set(["node_modules", ".git", "dist"]);

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (exts.has(ext)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }
  return files;
};

const normalizeTarget = (url) => {
  let target = url;
  if (target.includes("#")) target = target.split("#")[0];
  if (target.includes("?")) target = target.split("?")[0];
  if (target.endsWith("/")) target += "index.html";
  return target;
};

const rawMatches = [];
const files = walk(root);
const regex = /\/(?:static|es)\/[^\s"'<>)]*/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const matches = content.match(regex) || [];
  matches.forEach((match) => rawMatches.push({ file, match }));
}

const missing = [];
for (const { file, match } of rawMatches) {
  const target = normalizeTarget(match);
  const diskPath = path.join(root, target.replace(/^\//, ""));
  if (!fs.existsSync(diskPath)) {
    missing.push({ file, match, diskPath });
  }
}

if (missing.length) {
  console.error("Enlaces faltantes:");
  missing.forEach((entry) => {
    console.error(`- ${entry.match} (referenciado en ${entry.file})`);
  });
  process.exit(1);
} else {
  console.log("lint:links OK");
}

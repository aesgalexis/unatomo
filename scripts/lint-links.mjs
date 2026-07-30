import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exts = new Set([".html", ".js", ".mjs", ".css"]);
const ignoreDirs = new Set(["node_modules", ".git", "dist"]);
const ignorePaths = new Set(["firebase/functions/lib"]);

const toPosix = (value) => value.replaceAll("\\", "/");

const walk = (dir, files = []) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      const relativePath = toPosix(path.relative(root, entryPath));
      if (ignorePaths.has(relativePath)) continue;
      walk(entryPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (exts.has(ext)) {
        files.push(entryPath);
      }
    }
  }
  return files;
};

const normalizeTarget = (url) => {
  let target = url.replace(/[`;,.]+$/, "");
  if (target.includes("#")) target = target.split("#")[0];
  if (target.includes("?")) target = target.split("?")[0];
  if (target.endsWith("/")) target += "index.html";
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
};

const rawMatches = [];
const files = walk(root);
const regex = /\/(?:static|es|en|nfc|controlpanel)\/[^\s"'<>)]*/g;

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const result of content.matchAll(regex)) {
    const match = result[0];
    if (match.includes("${")) continue;

    const contextStart = Math.max(0, result.index - 120);
    const contextBefore = content.slice(contextStart, result.index);
    const usesPathPredicate =
      /\.(?:startsWith|endsWith|includes)\s*\([^)]*$/.test(contextBefore);
    if (usesPathPredicate) continue;

    rawMatches.push({
      file,
      match,
      contextBefore,
    });
  }
}

const missingByTarget = new Map();
for (const { file, match, contextBefore } of rawMatches) {
  const target = normalizeTarget(match);
  const candidates = [target];
  const usesLocalizedResolver =
    /\blocalizeEsPath\s*\([^)]*$/.test(contextBefore);
  const usesDynamicBasePrefix =
    /\$\{[^}]*\b(?:appBasePrefix|basePrefix)\b[^}]*\}/.test(contextBefore);

  if (
    /^\/(?:es|en)\//.test(target) &&
    (usesLocalizedResolver || usesDynamicBasePrefix)
  ) {
    candidates.push(`/nfc${target}`);
  }

  const exists = candidates.some((candidate) =>
    fs.existsSync(path.join(root, candidate.replace(/^\//, ""))),
  );

  if (!exists) {
    const existing = missingByTarget.get(target) || {
      target,
      references: 0,
      files: new Set(),
    };
    existing.references += 1;
    existing.files.add(toPosix(path.relative(root, file)));
    missingByTarget.set(target, existing);
  }
}

const missing = [...missingByTarget.values()].sort((a, b) =>
  a.target.localeCompare(b.target),
);

if (missing.length) {
  console.error("Enlaces faltantes:");
  missing.forEach((entry) => {
    const filesList = [...entry.files];
    const example = filesList[0];
    const extraFiles =
      filesList.length > 1
        ? `, ${filesList.length - 1} ${
            filesList.length === 2 ? "archivo" : "archivos"
          } más`
        : "";
    const referenceLabel =
      entry.references === 1 ? "referencia" : "referencias";
    console.error(
      `- ${entry.target} (${entry.references} ${referenceLabel}; ${example}${extraFiles})`,
    );
  });
  process.exit(1);
} else {
  console.log("lint:links OK");
}

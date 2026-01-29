import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const run = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

const node = process.version;
let npm = "unknown";
try {
  npm = run("npm -v");
} catch {}

let vite = "not installed";
try {
  if (existsSync("node_modules/vite/package.json")) {
    const pkg = JSON.parse(readFileSync("node_modules/vite/package.json", "utf8"));
    vite = pkg.version || "unknown";
  }
} catch {}

console.log(`node: ${node}`);
console.log(`npm: ${npm}`);
console.log(`vite: ${vite}`);
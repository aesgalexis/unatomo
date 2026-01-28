import { execSync } from "node:child_process";

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}

function runQuiet(cmd) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
}

const msg =
  process.argv.slice(2).join(" ").trim() ||
  `Update site (${new Date().toISOString().slice(0, 19).replace("T", " ")})`;

run("npm run build");

const status = runQuiet("git status --porcelain");
if (status) {
  run("git add .");
  run(`git commit -m "${msg.replaceAll('"', '\\"')}"`);
} else {
  console.log("\nℹ️  No hay cambios para commitear.\n");
}

let ahead = 0;
try {
  ahead = Number(runQuiet("git rev-list --count @{u}..HEAD")) || 0;
} catch (e) {
  ahead = -1;
}

if (ahead > 0) {
  console.log(`Pushing pending commits: ${ahead}`);
  try {
    run("git push origin main");
  } catch (e) {
    console.log("\n⚠️  Falló el push. Revisa el remoto o ejecuta 'git push origin main' manualmente.\n");
    process.exit(1);
  }
} else if (ahead === 0) {
  console.log("Nothing to push");
} else {
  console.log("No upstream configurado. Intentando push a origin/main...");
  try {
    run("git push origin main");
  } catch (e) {
    console.log("\n⚠️  No se pudo hacer push. Configura el upstream con:\n  git push -u origin main\n");
    process.exit(1);
  }
}

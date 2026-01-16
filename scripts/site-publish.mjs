import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const msg = process.argv.slice(2).join(" ").trim()
  || `Update site (${new Date().toISOString().slice(0, 19).replace("T", " ")})`;

try {
  run("npm run build");

  run("git add .");
  run(`git commit -m "${msg.replaceAll('"', '\\"')}"`);
  run("git push");
} catch (e) {
  console.log("\nℹ️  No había cambios para commitear o el commit falló. Revisa 'git status'.\n");
  process.exit(1);
}

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Uso: npm.cmd run firebase:clean -- <comando firebase>");
  process.exit(1);
}

const env = {...process.env};
delete env.DEBUG;
delete env.FIREBASE_DEBUG;

const command = process.platform === "win32" ? "firebase.cmd" : "firebase";
const result = spawnSync(command, args, {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

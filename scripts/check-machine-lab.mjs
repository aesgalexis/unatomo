import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LAB = path.join(ROOT, "dev", "machine-lab");
const TEST_MACHINE_URL =
  "/nfc/es/m.html?tag=G-P76W-ARQL";

for (const file of ["index.html", "machine-lab.css"]) {
  await access(path.join(LAB, file));
}

const html = await readFile(path.join(LAB, "index.html"), "utf8");
const iframeCount = (html.match(/<iframe\b/g) || []).length;
const machineUrlCount = html.split(TEST_MACHINE_URL).length - 1;
const credentiallessCount = (html.match(/\bcredentialless\b/g) || []).length;

if (iframeCount !== 3 || machineUrlCount !== 3) {
  throw new Error("El laboratorio debe mostrar exactamente tres vistas de Test Machine.");
}
if (credentiallessCount !== 3) {
  throw new Error("Las tres vistas deben aislar la sesión personal del navegador.");
}
if (/<(?:button|select|input)\b/i.test(html)) {
  throw new Error("El laboratorio simple no debe añadir controles propios.");
}

const buildScript = await readFile(path.join(ROOT, "scripts", "build-static.mjs"), "utf8");
if (!buildScript.includes('ROOT_IGNORE_DIRS = new Set(["dev"])')) {
  throw new Error("El build no excluye explícitamente dev/.");
}

try {
  await access(path.join(ROOT, "dist", "dev"));
  throw new Error("dist/dev existe: el laboratorio no debe publicarse.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log("Laboratorio simple de Test Machine configurado correctamente.");

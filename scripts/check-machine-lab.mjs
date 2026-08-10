import { access, readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LAB = path.join(ROOT, "dev", "machine-lab");
const TEST_MACHINE_URL =
  "/nfc/es/m.html?tag=G-P76W-ARQL";

for (const file of ["index.html", "machine-lab.css", "machine-lab.js"]) {
  await access(path.join(LAB, file));
}

const html = await readFile(path.join(LAB, "index.html"), "utf8");
const iframeCount = (html.match(/<iframe\b/g) || []).length;
const machineUrlCount = html.split(TEST_MACHINE_URL).length - 1;

if (iframeCount !== 1 || machineUrlCount !== 1) {
  throw new Error("El laboratorio debe mostrar exactamente una vista de Test Machine.");
}
if (/\bcredentialless\b/.test(html)) {
  throw new Error("La vista debe permitir el inicio de sesión de Firebase.");
}
if (!html.includes("phone-address-url") || !html.includes("./machine-lab.js")) {
  throw new Error("El Mobile Lab debe mostrar y actualizar la URL del móvil.");
}
if (/<(?:button|select|input)\b/i.test(html)) {
  throw new Error("El laboratorio simple no debe añadir controles propios.");
}

const buildScript = await readFile(path.join(ROOT, "scripts", "build-static.mjs"), "utf8");
const readAllowlist = (name) => {
  const match = buildScript.match(
    new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`),
  );
  if (!match) throw new Error(`No se encontró la allowlist ${name}.`);
  return [...match[1].matchAll(/['\"]([^'\"]+)['\"]/g)].map(
    ([, value]) => value,
  );
};
const publicFiles = readAllowlist("PUBLIC_FILES");
const publicDirectories = readAllowlist("PUBLIC_DIRECTORIES");
const publicPaths = [...publicFiles, ...publicDirectories];
if (publicPaths.some((value) => value === "dev" || value.startsWith("dev/"))) {
  throw new Error("La allowlist pública no debe publicar dev/.");
}

try {
  await access(path.join(ROOT, "dist", "dev"));
  throw new Error("dist/dev existe: el laboratorio no debe publicarse.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

console.log("Mobile Lab configurado correctamente.");

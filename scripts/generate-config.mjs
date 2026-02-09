import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "static", "js", "config", "runtime-config.js");
const ENV_FILES = [".env.local", ".env"];

const readEnvFile = async (filePath) => {
  try {
    const content = await readFile(filePath, "utf8");
    return content.split("\n").reduce((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return acc;
      const idx = trimmed.indexOf("=");
      if (idx === -1) return acc;
      const key = trimmed.slice(0, idx).trim();
      const raw = trimmed.slice(idx + 1).trim();
      const value = raw.replace(/^["']|["']$/g, "");
      acc[key] = value;
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const env = {};
for (const file of ENV_FILES) {
  Object.assign(env, await readEnvFile(path.join(ROOT, file)));
}

const config = {
  FIREBASE_API_KEY: env.FIREBASE_API_KEY || "",
  FIREBASE_AUTH_DOMAIN: env.FIREBASE_AUTH_DOMAIN || "",
  FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID || "",
  FIREBASE_STORAGE_BUCKET: env.FIREBASE_STORAGE_BUCKET || "",
  FIREBASE_MESSAGING_SENDER_ID: env.FIREBASE_MESSAGING_SENDER_ID || "",
  FIREBASE_APP_ID: env.FIREBASE_APP_ID || "",
  FIREBASE_MEASUREMENT_ID: env.FIREBASE_MEASUREMENT_ID || ""
};

await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
const payload =
  "window.__UNATOMO_CONFIG__ = " + JSON.stringify(config, null, 2) + ";\n";
await writeFile(CONFIG_PATH, payload, "utf8");

console.log("runtime-config.js generado.");

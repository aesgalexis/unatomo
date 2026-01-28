import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const target = resolve(process.argv[2] || "static/js");

const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && full.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
};

const main = async () => {
  const files = await walk(target);
  const failures = [];
  for (const file of files) {
    const result = spawnSync(
      process.execPath,
      ["--input-type=module", "--check"],
      {
        encoding: "utf8",
        input: await readFile(file, "utf8")
      }
    );
    if (result.status !== 0) {
      const msg = (result.stderr || result.stdout || "").trim();
      failures.push({ file, msg });
    }
  }

  if (!failures.length) {
    console.log("OK: 0 archivos con errores de sintaxis.");
    return;
  }

  console.log(`Errores de sintaxis encontrados: ${failures.length}`);
  failures.forEach((f) => {
    console.log("-", f.file);
    if (f.msg) console.log(f.msg.split("\n")[0]);
  });
  process.exit(1);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

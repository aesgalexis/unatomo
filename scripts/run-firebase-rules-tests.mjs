import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const projectRoot = path.resolve(import.meta.dirname, "..");
const configHome = path.join(tmpdir(), "unatomo-firebase-cli-config");
mkdirSync(configHome, { recursive: true });

const portableJdkRoot = path.join(projectRoot, ".tools", "jdk21");
const portableJavaHome = existsSync(portableJdkRoot)
  ? readdirSync(portableJdkRoot, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.startsWith("jdk-21"))
  : null;
const javaHome = portableJavaHome
  ? path.join(portableJdkRoot, portableJavaHome.name)
  : process.env.JAVA_HOME;

if (!javaHome) {
  console.error(
    "Firebase rules tests require JDK 21. Set JAVA_HOME or extract a portable JDK under .tools/jdk21/."
  );
  process.exit(1);
}

const require = createRequire(import.meta.url);
const firebaseBin = require.resolve("firebase-tools/lib/bin/firebase.js");
const testCommand = "node firebase/rules-tests/rules.test.mjs";
const result = spawnSync(
  process.execPath,
  [
    firebaseBin,
    "emulators:exec",
    "--only",
    "firestore,storage",
    "--project",
    "demo-unatomo-rules",
    testCommand
  ],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      XDG_CONFIG_HOME: configHome,
      JAVA_HOME: javaHome,
      PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`
    },
    stdio: "inherit",
    shell: false
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "release");
mkdirSync(output, { recursive: true });

const checksums = [];
for (const app of ["admin", "user"]) {
  const dist = resolve(root, "apps", app, "dist");
  for (const file of ["index.html", "version.lock"]) {
    if (!statSync(resolve(dist, file)).isFile()) {
      throw new Error(`Missing ${app}/${file}; run bun run package.`);
    }
  }
  const filename = `kendeji-${app}.tar.gz`;
  const archive = resolve(output, filename);
  const result = spawnSync("tar", ["-czf", archive, "-C", dist, "."], {
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Failed to package ${app}`);
  const hash = createHash("sha256").update(readFileSync(archive)).digest("hex");
  checksums.push(`${hash}  ${filename}`);
  console.log(`Created release/${filename}`);
}
writeFileSync(resolve(output, "SHA256SUMS"), `${checksums.join("\n")}\n`);

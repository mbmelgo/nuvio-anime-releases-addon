import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function collectJsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsFiles(path));
    else if (entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}

test("runtime source does not use deprecated url.parse API", async () => {
  const files = await collectJsFiles(".");
  const offenders = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (/\burl\.parse\s*\(/.test(source)) offenders.push(file);
  }
  assert.deepEqual(offenders, []);
});

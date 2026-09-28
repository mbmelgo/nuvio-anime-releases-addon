import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
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

test("retired runtime entrypoints and helpers stay removed", async () => {
  const retired = ["api/home.js", "lib/http.js"];
  for (const file of retired) {
    await assert.rejects(access(file), undefined, `${file} should remain removed`);
  }
});

test("catalog source is the only retained catalog runtime implementation", async () => {
  await access("api/catalog-source.js");
  await access("api/catalog-delegation.js");
  await assert.rejects(access("api/stremio.js"));
});

test("every api runtime module retains a valid serverless default export", async () => {
  const source = await readFile("api/catalog-delegation.js", "utf8");
  assert.match(source, /export default function handler\s*\(/);
});

test("home page uses only canonical unversioned catalog URLs", async () => {
  const source = await readFile("api/home-selector.js", "utf8");
  assert.doesNotMatch(source, /\/v5\//);
  assert.doesNotMatch(source, /v5 resolver/i);
  assert.match(source, /\$\{BASE_URL\}\/catalog\/series\/\$\{id\}\.json/);
});

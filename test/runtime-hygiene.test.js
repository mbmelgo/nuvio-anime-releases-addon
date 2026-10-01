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
  const retired = ["api/home.js", "api/stremio.js", "api/catalog-delegation.js", "lib/http.js", "lib/catalog-identity.js", "lib/release-version.js"];
  for (const file of retired) {
    await assert.rejects(access(file), undefined, `${file} should remain removed`);
  }
});

test("catalog source is the only retained catalog runtime implementation", async () => {
  await access("api/catalog-source.js");
  await assert.rejects(access("api/catalog-delegation.js"));
  await assert.rejects(access("api/stremio.js"));
});

test("every retained Vercel runtime module has a serverless default export", async () => {
  const runtimeFiles = ["api/catalog-source.js", "api/home-selector.js", "api/resolver-manifest.js"];
  for (const file of runtimeFiles) {
    const source = await readFile(file, "utf8");
    assert.match(source, /export default (?:async )?function\s+\w+\s*\(/, `${file} must export a default handler`);
  }
});

test("README and home page describe the current MAL-primary release", async () => {
  const readme = await readFile("README.md", "utf8");
  const home = await readFile("api/home-selector.js", "utf8");
  assert.match(readme, /\[!\[MAL\]\(https:\/\/img\.shields\.io\/badge\/MyAnimeList-identity-2e51a2\.svg\)\]\(https:\/\/myanimelist\.net\)/);
  assert.match(readme, /version-5\.5\.3-blue/);
  assert.match(readme, /MAL identities when available/);
  assert.match(readme, /\*\*Production:\*\* `v5\.5\.0`/);
  assert.match(readme, /\*\*Development:\*\* `v5\.5\.3`/);
  assert.doesNotMatch(readme, /AniList-only/);
  assert.match(home, /MAL is the primary catalog identity when available/);
  assert.match(home, /mal:&lt;id&gt;/);
  assert.doesNotMatch(home, /AniList-only/);
});

test("home page uses only canonical unversioned catalog URLs", async () => {
  const source = await readFile("api/home-selector.js", "utf8");
  assert.doesNotMatch(source, /\/v5\//);
  assert.doesNotMatch(source, /v5 resolver/i);
  assert.match(source, /\$\{BASE_URL\}\/catalog\/anime\/\$\{id\}\.json/);
});

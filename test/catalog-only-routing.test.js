import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vercelConfig = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const stremioSource = fs.readFileSync(new URL("../api/stremio.js", import.meta.url), "utf8");

function routeSources() {
  return (vercelConfig.rewrites || []).map((route) => route.source);
}

test("catalog-only architecture does not expose legacy metadata routes", () => {
  const sources = routeSources();
  assert.equal(sources.some((source) => /^\/v5\/meta\//.test(source)), false);
  assert.equal(sources.some((source) => /^\/meta\//.test(source)), false);
  assert.equal(sources.some((source) => /^\/api\/meta\//.test(source)), false);
});

test("catalog-only architecture keeps catalog routes available", () => {
  const sources = routeSources();
  assert.equal(sources.includes("/v5/catalog/:type/:id.json"), true);
  assert.equal(sources.includes("/catalog/:type/:id.json"), true);
});

test("catalog-only handler no longer implements a local metadata resource", () => {
  assert.equal(stremioSource.includes('resource === "meta"'), false);
  assert.equal(stremioSource.includes("buildDetailedMeta"), false);
  assert.equal(stremioSource.includes("JIKAN_URL"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vercelConfig = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const catalogSource = fs.readFileSync(new URL("../api/catalog-source.js", import.meta.url), "utf8");

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

test("catalog source implements catalog resources without local metadata resolution", () => {
  assert.equal(catalogSource.includes('resource === "meta"'), false);
  assert.equal(catalogSource.includes("buildDetailedMeta"), false);
  assert.equal(catalogSource.includes("JIKAN_URL"), false);
});

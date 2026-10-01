import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("MAL secondary addon uses a /mal/manifest.json subpath so Nuvio derives /mal as its base URL", () => {
  const sources = vercel.rewrites.map((rewrite) => rewrite.source);

  assert.ok(sources.includes("/mal/manifest.json"));
  assert.ok(sources.includes("/mal/catalog/:type/:id.json"));
  assert.ok(sources.includes("/mal/catalog/:type/:id/search=:search&skip=:skip.json"));
  assert.ok(sources.includes("/mal/catalog/:type/:id/:extra*"));
});

test("primary manifest and catalog routes remain unchanged", () => {
  const sources = vercel.rewrites.map((rewrite) => rewrite.source);

  assert.ok(sources.includes("/manifest.json"));
  assert.ok(sources.includes("/catalog/:type/:id.json"));
  assert.ok(!sources.includes("/mal/manifest-mal.json"));
});

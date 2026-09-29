import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("uses Wikidata MAL-to-TVDB mapping when MAL-Sync has no TVDB identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/2406"), body: { Sites: {} } },
    { match: (url) => url.includes("query.wikidata.org") && url.includes("P4086") && url.includes("2406") && url.includes("P4835"), body: { results: { bindings: [{ tvdb: { value: "359424" } }] } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:2406", name: "Sazae-san", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:359424");
  assert.equal(meta.extra.tvdbId, "359424");
  assert.equal(meta.extra.originalCatalogId, "mal:2406");
});

test("MAL-to-Wikidata-to-TVDB resolution is not hardcoded to Sazae-san", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/999999"), body: { Sites: {} } },
    { match: (url) => url.includes("query.wikidata.org") && url.includes("P4086") && url.includes("999999") && url.includes("P4835"), body: { results: { bindings: [{ tvdb: { value: "123456" } }] } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:999999", name: "Synthetic Anime", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:123456");
  assert.equal(meta.extra.tvdbId, "123456");
});

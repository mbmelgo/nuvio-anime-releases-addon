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

test("prefers the identity-specific Wikidata TVDB mapping over a generic MAL-Sync TVDB mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/53876"), body: { Sites: { TheTVDB: { "76703": {} } } } },
    { match: (url) => url.toLowerCase().includes("query.wikidata.org"), body: { results: { bindings: [{ tvdb: { value: "433862" } }] } } },
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("kitsu.io/api/edge/anime?") || url.includes("kitsu.io/api/edge/anime&"), body: { data: [] } },
  ]);

  const [meta] = await canonicalizeCatalogMetas([
    { id: "mal:53876", name: "Pokémon Horizons: The Series", type: "series" },
  ], { fetchImpl, now: 1000 });

  assert.equal(meta.id, "tvdb:433862");
  assert.equal(meta.extra.tvdbId, "433862");
});

test("does not let a generic MAL-Sync TVDB mapping override a verified Kitsu identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/999"), body: { Sites: { TheTVDB: { "470200": {} }, Kitsu: { main: { id: "9999" } } } } },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist"), body: { kitsu: 9999 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/9999") && !url.includes("/mappings"), body: { data: { id: "9999", attributes: { canonicalTitle: "Uncle's Obsession with Cute Things", titles: { en: "Uncle's Obsession with Cute Things" } } } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/9999/mappings"), body: { data: [] } },
    { match: (url) => url.includes("api.ani.zip") && url.includes("kitsu_id=9999"), body: { mappings: {} } },
    { match: (url) => url.toLowerCase().includes("query.wikidata.org"), body: { results: { bindings: [] } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime?") || url.includes("kitsu.io/api/edge/anime&"), body: { data: [] } },
  ]);

  const [meta] = await canonicalizeCatalogMetas([
    { id: "mal:999", name: "Uncle's Obsession with Cute Things", type: "series" },
  ], { fetchImpl, now: 1000 });

  assert.notEqual(meta.id, "tvdb:470200");
  assert.equal(meta.extra.kitsuId, "9999");
});

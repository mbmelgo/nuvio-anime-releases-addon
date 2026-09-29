import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";
import { NEGATIVE_CACHE_TTL_MS } from "../lib/canonical-state.js";

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

test("uses the catalog's AniList identity when MAL is unresolved so click-through does not retain a failing MAL id", async () => {
  const fetchImpl = mockFetch([]);
  const [meta] = await canonicalizeCatalogMetas([
    {
      id: "mal:53876",
      name: "Pokémon Horizons: The Series",
      type: "series",
      extra: { anilistId: 158871, malId: 53876 },
    },
  ], { fetchImpl, now: 1000 });

  assert.equal(meta.id, "anilist:158871");
  assert.equal(meta.extra.anilistId, 158871);
  assert.equal(meta.extra.malId, 53876);
  assert.equal(meta.originalCatalogId, "mal:53876");
});

test("retries an unresolved identity after the short negative-cache window", async () => {
  let secondPass = false;
  const fetchImpl = async (url) => {
    const key = new URL(url).toString();
    if (secondPass && key.toLowerCase().includes("query.wikidata.org")) {
      return new Response(JSON.stringify({ results: { bindings: [{ tvdb: { value: "452710" } }] } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
  };

  const input = [{ id: "mal:123456", name: "From Old Country Bumpkin to Master Swordsman", type: "series", released: "2025-04-05T00:00:00.000Z" }];
  const [first] = await canonicalizeCatalogMetas(input, { fetchImpl, now: 1000 });
  assert.equal(first.id, "mal:123456");

  secondPass = true;
  const [second] = await canonicalizeCatalogMetas(input, { fetchImpl, now: 1000 + NEGATIVE_CACHE_TTL_MS + 1 });
  assert.equal(second.id, "tvdb:452710");
  assert.equal(second.extra.tvdbId, "452710");
});

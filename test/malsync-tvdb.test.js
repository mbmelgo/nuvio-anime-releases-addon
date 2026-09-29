import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key));
    if (!route) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify(route.body), { status: route.status || 200 });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("prefers an identity-specific TVDB mapping over a broader MAL-Sync TVDB mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("api.malsync.moe/mal/anime/53876"), body: { Sites: { Kitsu: { "46859": {} }, TheTVDB: { "76703": {} } } } },
    { match: (url) => url.includes("query.wikidata.org") && url.includes("P4086") && url.includes("53876"), body: { results: { bindings: [{ tvdb: { value: "433862" } }] } } },
    { match: (url) => url.includes("mappings.anibridge.eliasbenb.dev"), body: { data: { "anilist:158871": { "tvdb_show:76703:s1": {} } } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/46859/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/46859") && !url.includes("/mappings"), body: { data: { id: "46859", attributes: { canonicalTitle: "Pokémon Horizons: The Series", titles: { en: "Pokémon Horizons: The Series" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:53876", name: "Pokémon Horizons: The Series", type: "series", extra: { anilistId: 158871 } }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:433862");
});

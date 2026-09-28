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

test("Wikidata TVDB identity overrides an incorrect AniBridge/Kitsu franchise mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("query.wikidata.org") && url.includes("158871"), body: { results: { bindings: [{ tvdb: { value: "433862" } }] } } },
    { match: (url) => url.includes("mappings.anibridge.eliasbenb.dev") && url.includes("provider=anilist") && url.includes("id=158871"), body: { data: { "anilist:158871": { "tvdb_show:76703:s1": {} } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:53876", name: "Pokémon Horizons: The Series", type: "series", extra: { anilistId: 158871 } }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:433862");
});

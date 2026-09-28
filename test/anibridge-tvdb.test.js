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

test("prefers AniBridge TVDB mapping over an incorrect Kitsu TVDB mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("mappings.anibridge.eliasbenb.dev") && url.includes("provider=anilist") && url.includes("id=53876"), body: { data: { "anilist:53876": { "tvdb_show:433862:s1": {} } } } },
    { match: (url) => url.includes("arm.haglund.dev"), body: { kitsu: 46859 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/46859/mappings"), body: { data: [{ attributes: { externalSite: "thetvdb/series", externalId: "76703" } }] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/46859") && !url.includes("/mappings"), body: { data: { id: "46859", attributes: { canonicalTitle: "Pokémon Horizons: The Series", titles: { en: "Pokémon Horizons: The Series" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "anilist:53876", name: "Pokémon Horizons: The Series", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:433862");
});

test("uses AniBridge when a Kitsu identity has no usable TVDB mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("mappings.anibridge.eliasbenb.dev") && url.includes("provider=anilist") && url.includes("id=196017"), body: { data: { "anilist:196017": { "tvdb_show:465802:s1": {} } } } },
    { match: (url) => url.includes("arm.haglund.dev"), body: { kitsu: 99999 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/99999/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/99999") && !url.includes("/mappings"), body: { data: { id: "99999", attributes: { canonicalTitle: "Grow Up Show: Himawari no Circus-dan", titles: { en: "Grow Up Show: Himawari no Circus-dan" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "anilist:196017", name: "Grow Up Show: Himawari no Circus-dan", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:465802");
});

test("uses AniBridge TVDB mapping for a direct MAL identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("mappings.anibridge.eliasbenb.dev") && url.includes("provider=mal") && url.includes("id=20583"), body: { data: { "mal:20583": { "tvdb_show:359424:s1": {} } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:20583", name: "Sazae-san", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:359424");
});

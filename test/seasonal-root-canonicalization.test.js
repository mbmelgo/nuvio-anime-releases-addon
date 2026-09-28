import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url, options = {}) => {
    const target = new URL(url).toString();
    const route = routes.find((entry) => entry.match(target, options));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("promotes a seasonal entry to the root series TVDB identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("id=20001"), body: { kitsu: 200, anilist: 2000 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/200/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/200") && !url.includes("/mappings"), body: { data: { id: "200", attributes: { canonicalTitle: "Example Anime Season 2", titles: { en: "Example Anime Season 2" } } } } },
    {
      match: (url) => url.includes("anilist.co/graphql") && url.includes("2000"),
      body: {
        data: {
          Media: {
            id: 2000,
            idMal: 20001,
            title: { romaji: "Example Anime Season 2" },
            relations: {
              edges: [
                {
                  relationType: "PREQUEL",
                  node: {
                    id: 1000,
                    idMal: 10001,
                    format: "TV",
                    title: { romaji: "Example Anime" },
                  },
                },
              ],
            },
          },
        },
      },
    },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist") && url.includes("id=1000"), body: { kitsu: 100 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100/mappings"), body: { data: [{ type: "mappings", id: "tvdb-12345", attributes: { externalSite: "thetvdb/series", externalId: "12345" } }] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100") && !url.includes("/mappings"), body: { data: { id: "100", attributes: { canonicalTitle: "Example Anime", titles: { en: "Example Anime" } } } } },
  ]);

  const [meta] = await canonicalizeCatalogMetas([
    { id: "mal:20001", name: "Example Anime Season 2", type: "series", extra: { anilistId: 2000 } },
  ], { fetchImpl, now: 1000 });

  assert.equal(meta.id, "tvdb:12345");
  assert.equal(meta.extra.kitsuId, "200");
  assert.equal(meta.extra.tvdbId, "12345");
  assert.equal(meta.extra.tvdbSourceAnilistId, "1000");
  assert.equal(meta.extra.originalCatalogId, "mal:20001");
});

test("preserves the seasonal identity when no root TVDB mapping exists", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist"), body: { kitsu: 200, anilist: 2000 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/200/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/200") && !url.includes("/mappings"), body: { data: { id: "200", attributes: { canonicalTitle: "Example Anime Season 2", titles: { en: "Example Anime Season 2" } } } } },
    {
      match: (url) => url.includes("anilist.co/graphql") && url.includes("2000"),
      body: {
        data: {
          Media: {
            id: 2000,
            idMal: 20001,
            title: { romaji: "Example Anime Season 2" },
            relations: {
              edges: [
                {
                  relationType: "PREQUEL",
                  node: {
                    id: 1000,
                    idMal: 10001,
                    format: "TV",
                    title: { romaji: "Example Anime" },
                  },
                },
              ],
            },
          },
        },
      },
    },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist") && url.includes("id=1000"), body: { kitsu: 100 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100") && !url.includes("/mappings"), body: { data: { id: "100", attributes: { canonicalTitle: "Example Anime", titles: { en: "Example Anime" } } } } },
  ]);

  const [meta] = await canonicalizeCatalogMetas([
    { id: "mal:20001", name: "Example Anime Season 2", type: "series", extra: { anilistId: 2000 } },
  ], { fetchImpl, now: 1000 });

  assert.equal(meta.id, "mal:20001");
  assert.equal(meta.extra.kitsuId, "200");
  assert.equal(meta.extra.tvdbId, undefined);
});

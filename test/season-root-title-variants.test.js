import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache, titleMatches } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url, options = {}) => {
    const target = new URL(url).toString();
    const route = routes.find((entry) => entry.match(target, options));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

function graphqlId(options) {
  try { return JSON.parse(options.body || "{}").variables?.id; } catch { return null; }
}

test.beforeEach(() => clearCanonicalizationCache());

test("uses an AniList predecessor when the current seasonal entry has no Kitsu mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("id=30001"), body: {} },
    { match: (url) => url.includes("api.ani.zip") && url.includes("mal_id=30001"), body: { mappings: {} } },
    { match: (url) => url.includes("api.malsync.moe") && url.includes("/30001"), body: { Sites: {} } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime") && url.includes("filter%5Btext%5D=Season%202"), body: { data: [] } },
    { match: (url, options) => url.includes("graphql.anilist.co") && graphqlId(options) === 3000, body: { data: { Media: { id: 3000, idMal: 30001, format: "TV", title: { romaji: "Example Season 2", english: "Example Season 2", native: "例アニメ 第2期" }, relations: { edges: [{ relationType: "PREQUEL", node: { id: 2000, idMal: 20001, format: "TV", title: { romaji: "Example Anime", english: "Example Anime", native: "例アニメ" } } }] } } } } },
    { match: (url, options) => url.includes("graphql.anilist.co") && graphqlId(options) === 2000, body: { data: { Media: { id: 2000, idMal: 20001, format: "TV", title: { romaji: "Example Anime", english: "Example Anime", native: "例アニメ" }, relations: { edges: [] } } } } },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist") && url.includes("id=2000"), body: { kitsu: 100 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100/mappings"), body: { data: [{ attributes: { externalSite: "thetvdb/series", externalId: "12345" } }] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/100") && !url.includes("/mappings"), body: { data: { id: "100", attributes: { canonicalTitle: "Example Anime", titles: { en: "Example Anime", en_jp: "Example Anime", ja_jp: "例アニメ" } } } } },
  ]);

  const [meta] = await canonicalizeCatalogMetas([
    { id: "mal:30001", name: "Example Season 2", type: "series", extra: { anilistId: 3000, titleRomaji: "Example Season 2", titleNative: "例アニメ 第2期" } },
  ], { fetchImpl, now: 1000 });

  assert.equal(meta.id, "tvdb:12345");
  assert.equal(meta.extra.tvdbSourceAnilistId, "2000");
});

test("accepts a matching Japanese native title alongside romaji", () => {
  assert.equal(titleMatches(["Example Anime", "例アニメ"], { canonicalTitle: "Example Anime", titles: { ja_jp: "例アニメ" } }), true);
  assert.equal(titleMatches("例アニメ", { canonicalTitle: "Example Anime", titles: { ja_jp: "例アニメ" } }), true);
});

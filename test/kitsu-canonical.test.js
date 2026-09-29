import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeCatalogMetas,
  canonicalizeId,
  clearCanonicalizationCache,
  normalizeTitle,
  titleMatches,
} from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("uses a verified TVDB series ID as the Nuvio-facing identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("id=60636"), body: { kitsu: 12345, anilist: 123 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345/mappings"), body: { data: [{ type: "mappings", id: "tvdb-81797", attributes: { externalSite: "thetvdb/series", externalId: "81797" } }] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345") && !url.includes("/mappings"), body: { data: { id: "12345", attributes: { canonicalTitle: "One Piece", titles: { en: "One Piece" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:60636", name: "One Piece", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:81797");
  assert.equal(meta.extra.kitsuId, "12345");
  assert.equal(meta.extra.tvdbId, "81797");
  assert.equal(meta.extra.originalCatalogId, "mal:60636");
});

test("falls back to the original metadata-provider ID when only a TVDB season mapping exists", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), body: { kitsu: 49746 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/49746/mappings"), body: { data: [{ type: "mappings", id: "tvdb-season-305089", attributes: { externalSite: "thetvdb/season", externalId: "305089" } }] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/49746") && !url.includes("/mappings"), body: { data: { id: "49746", attributes: { canonicalTitle: "Re:ZERO -Starting Life in Another World- Season 4", titles: { en: "Re:ZERO -Starting Life in Another World- Season 4" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:61316", name: "Re:ZERO -Starting Life in Another World- Season 4", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "mal:61316");
  assert.equal(meta.extra.kitsuId, "49746");
  assert.equal(meta.extra.tvdbId, undefined);
});

test("uses AniZip TVDB series mapping when Kitsu relationships do not expose one", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), body: { kitsu: 12345 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345") && !url.includes("/mappings"), body: { data: { id: "12345", attributes: { canonicalTitle: "One Piece", titles: { en: "One Piece" } } } } },
    { match: (url) => url.includes("api.ani.zip") && url.includes("kitsu_id=12345"), body: { mappings: { kitsu_id: 12345, thetvdb_id: 81797 } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:21", name: "One Piece", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:81797");
  assert.equal(meta.extra.tvdbId, "81797");
});

test("uses Kitsu as the canonical identity when ARM mapping and Kitsu title both verify", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("id=60636"), body: { kitsu: 12345, anilist: 123 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345") && !url.includes("/mappings"), body: { data: { id: "12345", attributes: { canonicalTitle: "One Piece", titles: { en: "One Piece" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:60636", name: "One Piece", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "mal:60636");
  assert.equal(meta.extra.kitsuId, "12345");
  assert.equal(meta.extra.originalCatalogId, "mal:60636");
});

test("rejects a bad ARM mapping when the Kitsu candidate title does not match", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist"), body: { kitsu: 99999 } },
    { match: (url) => url.includes("api.ani.zip") && url.includes("mal_id=60636"), body: { mappings: { kitsu_id: 12345 } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/99999") && !url.includes("/mappings"), body: { data: { id: "99999", attributes: { canonicalTitle: "Dragon", titles: { en: "Dragon" } } } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345") && !url.includes("/mappings"), body: { data: { id: "12345", attributes: { canonicalTitle: "One Piece", titles: { en: "One Piece" } } } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345/mappings"), body: { data: [{ type: "mappings", id: "tvdb-81797", attributes: { externalSite: "thetvdb/series", externalId: "81797" } }] } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:60636", name: "One Piece", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:81797");
});

test("falls back from ARM to AniZip for an AniList identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip") && url.includes("anilist_id=456"), body: { mappings: { kitsu_id: 67890 } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/67890/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/67890") && !url.includes("/mappings"), body: { data: { id: "67890", attributes: { canonicalTitle: "Example Anime", titles: { en: "Example Anime" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "anilist:456", name: "Example Anime", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "anilist:456");
  assert.equal(meta.extra.kitsuId, "67890");
});

test("uses MAL-Sync before title search for MAL identities", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/999"), body: { Sites: { Kitsu: { main: { id: "777" } } } } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/777/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/777") && !url.includes("/mappings"), body: { data: { id: "777", attributes: { canonicalTitle: "Example Anime", titles: { en: "Example Anime" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:999", name: "Example Anime", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "mal:999");
  assert.equal(meta.extra.kitsuId, "777");
});

test("title fallback only accepts an exact normalized Kitsu title", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("api.malsync.moe"), status: 404, body: {} },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime?") || url.includes("kitsu.io/api/edge/anime&"),
      body: {
        data: [
          { id: "111", attributes: { canonicalTitle: "The Elusive Samurai", titles: { en: "The Elusive Samurai" } } },
          { id: "222", attributes: { canonicalTitle: "The Elusive Samurai Season 2", titles: { en: "The Elusive Samurai Season 2" } } },
        ],
      },
    },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime/222/mappings"),
      body: { data: [] },
    },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime/222") && !url.includes("/mappings"),
      body: {
        data: {
          id: "222",
          attributes: {
            canonicalTitle: "The Elusive Samurai Season 2",
            titles: { en: "The Elusive Samurai Season 2" },
          },
        },
      },
    },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:1234", name: "The Elusive Samurai Season 2", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "mal:1234");
  assert.equal(meta.extra.kitsuId, "222");
});

test("uses an exact title match in Wikidata to recover a TVDB series when provider mappings are absent", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("api.malsync.moe"), status: 404, body: {} },
    { match: (url) => url.includes("kitsu.io/api/edge/anime?") || url.includes("kitsu.io/api/edge/anime&"), body: { data: [] } },
    { match: (url) => url.toLowerCase().includes("query.wikidata.org") && url.includes("P4835") && url.toLowerCase().includes("sazae-san"), body: { results: { bindings: [{ tvdb: { value: "359424" } }] } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:2406", name: "Sazae-san", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:359424");
  assert.equal(meta.extra.tvdbId, "359424");
});

test("preserves the original identity when every canonicalization source fails", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({}), { status: 503 });
  const metas = [
    { id: "mal:1234", name: "Unknown Anime", type: "series" },
    { id: "anilist:5678", name: "Unknown Anime 2", type: "series" },
  ];
  const result = await canonicalizeCatalogMetas(metas, { fetchImpl, now: 1000 });
  assert.deepEqual(result.map((meta) => meta.id), ["mal:1234", "anilist:5678"]);
  assert.equal(result.length, metas.length);
});

test("canonicalization never drops catalog items", async () => {
  const fetchImpl = async () => new Response(JSON.stringify({}), { status: 503 });
  const metas = Array.from({ length: 50 }, (_, index) => ({ id: `mal:${index + 1}`, name: `Anime ${index + 1}`, type: "series" }));
  const result = await canonicalizeCatalogMetas(metas, { fetchImpl, now: 1000 });
  assert.equal(result.length, 50);
});

test("deduplicates repeated source identities within one catalog request", async () => {
  let armCalls = 0;
  const fetchImpl = mockFetch([
    {
      match: (url) => {
        if (url.includes("arm.haglund.dev")) armCalls += 1;
        return url.includes("arm.haglund.dev");
      },
      body: { kitsu: 12345 },
    },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/12345") && !url.includes("/mappings"), body: { data: { id: "12345", attributes: { canonicalTitle: "One Piece", titles: { en: "One Piece" } } } } },
  ]);
  const result = await canonicalizeCatalogMetas([
    { id: "mal:60636", name: "One Piece", type: "series" },
    { id: "mal:60636", name: "One Piece", type: "series" },
  ], { fetchImpl, now: 1000 });
  assert.equal(armCalls, 1);
  assert.deepEqual(result.map((meta) => meta.id), ["mal:60636", "mal:60636"]);
});

test("title normalization handles punctuation and Unicode variants", () => {
  assert.equal(normalizeTitle("Re:Zero − Starting Life in Another World"), "re zero starting life in another world");
  assert.equal(titleMatches("Re:Zero − Starting Life in Another World", { canonicalTitle: "Re Zero Starting Life in Another World" }), true);
});

test("canonicalizeId promotes a verified TVDB ID and otherwise preserves source identity", () => {
  assert.equal(canonicalizeId("mal:123", null), "mal:123");
  assert.equal(canonicalizeId("anilist:456", undefined), "anilist:456");
  assert.equal(canonicalizeId("mal:123", null, "81797"), "tvdb:81797");
});

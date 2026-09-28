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

test("uses Kitsu as the canonical identity when ARM verifies the mapping", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("id=60636"), body: { kitsu: 12345, anilist: 123 } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:60636", name: "One Piece", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "kitsu:12345");
  assert.equal(meta.extra.kitsuId, "12345");
});

test("falls back from ARM to AniZip for an AniList identity", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip") && url.includes("anilist_id=456"), body: { mappings: { kitsu_id: 67890 } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "anilist:456", name: "Example Anime", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "kitsu:67890");
});

test("uses MAL-Sync before title search for MAL identities", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("api.malsync.moe") && url.endsWith("/999"), body: { Sites: { Kitsu: { main: { id: "777" } } } } },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:999", name: "Example Anime", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "kitsu:777");
});

test("title fallback only accepts an exact normalized Kitsu title", async () => {
  const fetchImpl = mockFetch([
    { match: (url) => url.includes("arm.haglund.dev"), status: 404, body: {} },
    { match: (url) => url.includes("api.ani.zip"), status: 404, body: {} },
    { match: (url) => url.includes("api.malsync.moe"), status: 404, body: {} },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime"),
      body: { data: [
        { id: "111", attributes: { canonicalTitle: "The Elusive Samurai", titles: { en: "The Elusive Samurai" } } },
        { id: "222", attributes: { canonicalTitle: "The Elusive Samurai Season 2", titles: { en: "The Elusive Samurai Season 2" } } },
      ] },
    },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{ id: "mal:1234", name: "The Elusive Samurai Season 2", type: "series" }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "kitsu:222");
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

test("title normalization handles punctuation and Unicode variants", () => {
  assert.equal(normalizeTitle("Re:Zero − Starting Life in Another World"), "re zero starting life in another world");
  assert.equal(titleMatches("Re:Zero − Starting Life in Another World", { canonicalTitle: "Re Zero Starting Life in Another World" }), true);
});

test("canonicalizeId preserves source identity when no Kitsu ID exists", () => {
  assert.equal(canonicalizeId("mal:123", null), "mal:123");
  assert.equal(canonicalizeId("anilist:456", undefined), "anilist:456");
});

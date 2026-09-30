import assert from "node:assert/strict";
import test from "node:test";
import { resolveAniListMappings } from "../lib/anibridge-resolver.js";

test("AniBridge resolves a seasonal AniList page with one batched ID query", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;

  globalThis.fetch = async (url) => {
    requestUrl = String(url);
    return new Response(JSON.stringify({
      items: [
        {
          descriptor: "anilist:185874",
          provider: "anilist",
          entry_id: "185874",
          edges: [
            { target_provider: "tvdb_show", target_entry_id: "74796", target_scope: "s17", source_range: "1-13" },
            { target_provider: "tmdb_show", target_entry_id: "30984", target_scope: "s2", source_range: "1-13" },
          ],
          anilist: {
            id: 185874,
            title: { english: "Bleach: Thousand-Year Blood War", romaji: "Bleach: Sennen Kessen-hen" },
            coverImage: { medium: "https://example.test/bleach.jpg" },
            status: "RELEASING",
            format: "TV",
          },
        },
        {
          descriptor: "anilist:166254",
          provider: "anilist",
          entry_id: "166254",
          edges: [
            { target_provider: "imdb_show", target_entry_id: "tt28399462", target_scope: "s1", source_range: "1-150" },
          ],
          anilist: {
            id: 166254,
            title: { english: "Pokémon Horizons", romaji: "Pokemon (2023)" },
            coverImage: { medium: "https://example.test/pokemon.jpg" },
            status: "RELEASING",
            format: "TV",
          },
        },
      ],
      total: 2,
      page: 1,
      per_page: 2,
      pages: 1,
      with_anilist: true,
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const result = await resolveAniListMappings([185874, 166254], globalThis.fetch);

    const query = new URL(requestUrl).searchParams;
    assert.equal(query.get("with_anilist"), "true");
    assert.equal(query.get("per_page"), "2");
    assert.equal(query.get("page"), "1");
    assert.equal(query.get("q"), "source.provider:anilist source.id:185874,166254");

    assert.deepEqual(result.get("185874"), {
      tmdb: "30984",
      imdb: null,
      tvdb: "74796",
      anilist: {
        id: 185874,
        title: { english: "Bleach: Thousand-Year Blood War", romaji: "Bleach: Sennen Kessen-hen" },
        coverImage: { medium: "https://example.test/bleach.jpg" },
        status: "RELEASING",
        format: "TV",
      },
    });
    assert.equal(result.get("166254").imdb, "tt28399462");
    assert.equal(result.get("166254").tmdb, null);
    assert.equal(result.has("999999"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AniBridge resolution deduplicates invalid and repeated AniList IDs", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ items: [], total: 0, page: 1, per_page: 1, pages: 0, with_anilist: true }), { status: 200 });
  };

  try {
    const result = await resolveAniListMappings(["185874", 185874, "not-an-id", null], globalThis.fetch);
    assert.equal(calls, 1);
    assert.equal(result.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { queryAnime, queryAiringSchedulePage } from "../lib/catalog-anilist.js";

test("catalog AniList queries request only preview and identity fields", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({
      data: { Page: { media: [{
        id: 166254,
        idMal: 53876,
        title: { romaji: "Pokemon Horizons", english: "Pokémon Horizons", native: "ポケットモンスター" },
        coverImage: { large: "https://example.test/poster.jpg" },
        status: "RELEASING",
        startDate: { year: 2023, month: 4, day: 14 },
        endDate: { year: null },
        nextAiringEpisode: { episode: 150, airingAt: 1790000000 },
      }] } },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
    const result = await queryAnime(filter, 2, "Pokémon Horizons");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "mal:53876");
    assert.equal(result[0].extra.anilistId, 166254);
    assert.match(request.query, /idMal/);
    assert.match(request.query, /coverImage/);
    assert.match(request.query, /nextAiringEpisode/);
    assert.doesNotMatch(request.query, /description/);
    assert.doesNotMatch(request.query, /genres/);
    assert.doesNotMatch(request.query, /averageScore/);
    assert.equal(request.variables.page, 2);
    assert.equal(request.variables.search, "Pokémon Horizons");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("schedule queries are page-bounded and request only fields used by the catalog", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: { Page: { airingSchedules: [] } } }), { status: 200 });
  };

  try {
    const result = await queryAiringSchedulePage(1790000000000, 1791000000000, false, 4);
    assert.deepEqual(result, []);
    assert.equal(request.variables.page, 4);
    assert.match(request.query, /airingSchedules/);
    assert.match(request.query, /episode/);
    assert.match(request.query, /airingAt/);
    assert.doesNotMatch(request.query, /nextAiringEpisode/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

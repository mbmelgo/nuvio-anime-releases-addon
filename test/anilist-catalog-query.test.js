import test from "node:test";
import assert from "node:assert/strict";
import { queryAnime, queryAiringSchedulePage } from "../lib/catalog-anilist.js";

test("catalog AniList queries request all seasonal anime formats without a status filter", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: { Page: { media: [] } } }), { status: 200 });
  };

  try {
    await queryAnime({ season: { season: "FALL", year: 2026 }, sort: ["ID"] }, 1);
    assert.equal(request.variables.page, 1);
    assert.equal(request.variables.season, "FALL");
    assert.equal(request.variables.seasonYear, 2026);
    assert.equal(request.variables.sort[0], "ID");
    assert.equal(Object.hasOwn(request.variables, "status"), false);
    assert.match(request.query, /format_in:\[TV,TV_SHORT,ONA,OVA,SPECIAL,MOVIE\]/);
    assert.doesNotMatch(request.query, /status:\$status/);
    assert.match(request.query, /perPage:50/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog AniList queries request 50 media rows with only fields needed to render Nuvio previews", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({
      data: {
        Page: {
          media: [{
            id: 166254,
            title: { english: "Pokémon Horizons", romaji: "Pokemon Horizons", native: "ポケットモンスター" },
            coverImage: { large: "https://example.test/pokemon.jpg" },
            status: "RELEASING",
            startDate: { year: 2026, month: 4, day: 11 },
            endDate: { year: null },
            genres: ["Action", "Adventure"],
          }],
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const filter = { season: { season: "FALL", year: 2026 }, sort: ["ID"] };
    const result = await queryAnime(filter, 2, "Pokémon Horizons");
    assert.deepEqual(result, [{
      id: 166254,
      title: { english: "Pokémon Horizons", romaji: "Pokemon Horizons", native: "ポケットモンスター" },
      coverImage: { large: "https://example.test/pokemon.jpg" },
      status: "RELEASING",
      startDate: { year: 2026, month: 4, day: 11 },
      endDate: { year: null },
      genres: ["Action", "Adventure"],
    }]);
    assert.equal(request.variables.page, 2);
    assert.equal(request.variables.search, "Pokémon Horizons");
    assert.deepEqual(request.variables.sort, ["ID"]);
    assert.match(request.query, /perPage:50/);
    assert.match(request.query, /\bid\b/);
    assert.match(request.query, /title\s*\{/);
    assert.match(request.query, /coverImage\s*\{/);
    assert.match(request.query, /status/);
    assert.match(request.query, /startDate\s*\{/);
    assert.match(request.query, /endDate\s*\{/);
    assert.match(request.query, /genres/);
    assert.doesNotMatch(request.query, /idMal/);
    assert.doesNotMatch(request.query, /externalLinks/);
    assert.doesNotMatch(request.query, /nextAiringEpisode/);
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
    assert.match(request.query, /perPage:50/);
    assert.match(request.query, /airingSchedules/);
    assert.match(request.query, /episode/);
    assert.match(request.query, /airingAt/);
    assert.doesNotMatch(request.query, /nextAiringEpisode/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

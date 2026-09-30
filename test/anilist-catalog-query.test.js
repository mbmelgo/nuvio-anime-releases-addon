import test from "node:test";
import assert from "node:assert/strict";
import { queryAnime, queryAiringSchedulePage } from "../lib/catalog-anilist.js";

test("catalog AniList queries request 50 media IDs and no external metadata fields", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (_url, options) => {
    request = JSON.parse(options.body);
    return new Response(JSON.stringify({
      data: { Page: { media: [{ id: 166254 }, { id: 185874 }] } },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["ID"] };
    const result = await queryAnime(filter, 2, "Pokémon Horizons");
    assert.deepEqual(result, [166254, 185874]);
    assert.equal(request.variables.page, 2);
    assert.equal(request.variables.search, "Pokémon Horizons");
    assert.deepEqual(request.variables.sort, ["ID"]);
    assert.match(request.query, /perPage:50/);
    assert.match(request.query, /\bid\b/);
    assert.doesNotMatch(request.query, /idMal/);
    assert.doesNotMatch(request.query, /title\s*\{/);
    assert.doesNotMatch(request.query, /coverImage/);
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

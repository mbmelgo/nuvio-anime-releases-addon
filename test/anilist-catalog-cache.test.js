import test from "node:test";
import assert from "node:assert/strict";
import { clearCatalogSourceCache, queryAnimeAll, queryAiringSchedule } from "../api/catalog-source.js";

test.beforeEach(() => {
  clearCatalogSourceCache();
});

function responseForMedia() {
  return new Response(JSON.stringify({
    data: {
      Page: {
        media: [{
          id: 195604,
          idMal: 61967,
          title: { romaji: "Black Clover 2nd Season", english: "Black Clover Season 2", native: "ブラッククローバー 第2期" },
          coverImage: { large: "https://example.test/poster.jpg" },
          status: "NOT_YET_RELEASED",
        }],
      },
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("deduplicates repeated AniList catalog queries in the runtime cache", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return responseForMedia(); };
  try {
    const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
    const first = await queryAnimeAll(filter);
    const second = await queryAnimeAll(filter);
    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("serves stale airing-schedule data when AniList is temporarily rate limited", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({
        data: { Page: { airingSchedules: [{ id: 1, airingAt: 1790501400, episode: 2851, media: { id: 2406, idMal: 2406, title: { romaji: "Sazae-san", english: null, native: "サザエさん" }, format: "TV", status: "RELEASING" } }] } },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ errors: [{ message: "Too Many Requests." }] }), { status: 429, headers: { "Content-Type": "application/json" } });
  };
  try {
    const first = await queryAiringSchedule(1790000000000, 1791000000000, false, 0);
    const stale = await queryAiringSchedule(1790000000000, 1791000000000, false, 301000);
    assert.equal(first.length, 1);
    assert.equal(stale.length, 1);
    assert.equal(stale[0].media.idMal, 2406);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

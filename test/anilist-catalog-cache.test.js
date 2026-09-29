import test from "node:test";
import assert from "node:assert/strict";
import { clearCatalogSourceCache, queryAnimeAll } from "../api/catalog-source.js";

test.beforeEach(() => {
  clearCatalogSourceCache();
});

test("deduplicates repeated AniList catalog queries in the runtime cache", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      data: {
        Page: {
          media: [
            {
              id: 195604,
              idMal: 61967,
              title: {
                romaji: "Black Clover 2nd Season",
                english: "Black Clover Season 2",
                native: "ブラッククローバー 第2期",
              },
              coverImage: { large: "https://example.test/poster.jpg" },
              status: "NOT_YET_RELEASED",
            },
          ],
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const filter = {
      season: { season: "FALL", year: 2026 },
      status: "NOT_YET_RELEASED",
      sort: ["START_DATE", "TITLE_ROMAJI"],
    };
    const first = await queryAnimeAll(filter);
    const second = await queryAnimeAll(filter);

    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

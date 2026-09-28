import test from "node:test";
import assert from "node:assert/strict";
import { delegateCompatibleIds } from "../api/catalog-delegation.js";

test("catalog delegation converts mapped MAL IDs to IMDb IDs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: {
      Page: {
        media: [{
          id: 39535,
          idMal: 34134,
          externalLinks: [{ site: "IMDb", url: "https://www.imdb.com/title/tt13293588/" }],
        }],
      },
    },
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const result = await delegateCompatibleIds([
      { id: "mal:34134", type: "series", name: "Mushoku Tensei" },
      { id: "mal:999999", type: "series", name: "Unmapped Anime" },
    ]);

    assert.equal(result[0].id, "tt13293588");
    assert.equal(result[1].id, "mal:999999");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog delegation preserves existing metadata when no IMDb mapping exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { Page: { media: [] } } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

  try {
    const input = { id: "anilist:12345", type: "series", name: "Example" };
    const result = await delegateCompatibleIds([input]);
    assert.deepEqual(result, [input]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

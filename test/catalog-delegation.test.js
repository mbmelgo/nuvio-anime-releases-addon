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
          title: { romaji: "Mushoku Tensei II: Isekai Ittara Honki Dasu Part 2", english: "Mushoku Tensei: Jobless Reincarnation Season 2 Part 2", native: "無職転生 II ～異世界行ったら本気だす～" },
          synonyms: ["Mushoku Tensei II"],
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

test("catalog delegation uses the original anime name when ID metadata has no compatible link", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call <= 2) {
      return new Response(JSON.stringify({ data: { Page: { media: [{
        id: 12345,
        idMal: 54321,
        title: { romaji: "Example Anime Season 2", english: "Example Anime Season 2", native: "例示アニメ 第2期" },
        synonyms: ["Example Anime"],
        externalLinks: [],
      }] } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({ results: { bindings: [{
      label: { value: "Example Anime" },
      imdb: { value: "tt12345678" },
    }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await delegateCompatibleIds([
      { id: "mal:54321", type: "series", name: "Example Anime Season 2" },
    ]);
    assert.equal(result[0].id, "tt12345678");
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

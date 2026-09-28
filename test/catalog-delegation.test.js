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

test("catalog delegation batches large MAL ID sets for AniList lookup", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, options = {}) => {
    calls += 1;
    const variables = JSON.parse(String(options.body)).variables;
    const ids = variables.idMal_in;
    const media = ids.map((id) => ({
      id: id + 100000,
      idMal: id,
      title: { romaji: `Anime ${id}`, english: `Anime ${id}`, native: `Anime ${id}` },
      synonyms: [],
      externalLinks: [{ site: "IMDb", url: `https://www.imdb.com/title/tt${String(id).padStart(7, "0")}/` }],
      relations: { edges: [] },
    }));
    return new Response(JSON.stringify({ data: { Page: { media } } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const input = Array.from({ length: 51 }, (_, index) => ({
      id: `mal:${10000 + index}`,
      type: "series",
      name: `Anime ${10000 + index}`,
    }));
    const result = await delegateCompatibleIds(input);

    assert.equal(calls, 2);
    assert.equal(result.length, 51);
    assert.equal(result[0].id, "tt00010000");
    assert.equal(result[50].id, "tt00010050");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog delegation uses AniZip when AniList has no compatible link", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async (_url, options = {}) => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ data: { Page: { media: [{
        id: 12345,
        idMal: 54321,
        title: { romaji: "Example Anime", english: "Example Anime", native: "例示アニメ" },
        synonyms: [],
        externalLinks: [],
        relations: { edges: [] },
      }] } } }), { status: 200, headers: { "content-type": "application/json" } });
    }

    assert.match(String(options.method || "GET"), /^GET$/i);
    assert.match(_url, /mal_id=54321/);
    return new Response(JSON.stringify({ mappings: { imdb_id: "tt12345678" } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await delegateCompatibleIds([{ id: "mal:54321", type: "series", name: "Example Anime" }]);
    assert.equal(result[0].id, "tt12345678");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog delegation prefers the original anime's related metadata for a season", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    return new Response(JSON.stringify({ data: { Page: { media: [{
      id: 210031,
      idMal: 63832,
      title: { romaji: "Seihantai na Kimi to Boku Season 2", english: "You and I Are Polar Opposites Season 2", native: "正反対な君と僕 Season 2" },
      synonyms: [],
      externalLinks: [],
      relations: { edges: [{ relationType: "PREQUEL", node: { id: 176923, idMal: 56966, title: { romaji: "Seihantai na Kimi to Boku", english: "You and I Are Polar Opposites", native: "正反対な君と僕" }, externalLinks: [{ site: "IMDb", url: "https://www.imdb.com/title/tt37532731/" }] } }] },
    }] } } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await delegateCompatibleIds([{ id: "mal:63832", type: "series", name: "You and I Are Polar Opposites Season 2" }]);
    assert.equal(result[0].id, "tt37532731");
    assert.ok(call >= 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog delegation uses the original anime name when ID and AniZip metadata have no compatible link", async () => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  globalThis.fetch = async (_url, options = {}) => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ data: { Page: { media: [{
        id: 12345,
        idMal: 54321,
        title: { romaji: "Example Anime Season 2", english: "Example Anime Season 2", native: "例示アニメ 第2期" },
        synonyms: ["Example Anime"],
        externalLinks: [],
        relations: { edges: [] },
      }] } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (call === 2) {
      return new Response(JSON.stringify({ mappings: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }

    assert.equal(options.method, "POST");
    assert.match(String(options.headers?.["content-type"] || ""), /application\/x-www-form-urlencoded/i);
    assert.match(String(options.body || ""), /query=/);
    return new Response(JSON.stringify({ results: { bindings: [{ label: { value: "Example Anime" }, imdb: { value: "tt12345678" } }] } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await delegateCompatibleIds([{ id: "mal:54321", type: "series", name: "Example Anime Season 2" }]);
    assert.equal(result[0].id, "tt12345678");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("catalog delegation preserves existing metadata when no compatible mapping exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { Page: { media: [] } } }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const input = { id: "anilist:12345", type: "series", name: "Example" };
    const result = await delegateCompatibleIds([input]);
    assert.deepEqual(result, [input]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

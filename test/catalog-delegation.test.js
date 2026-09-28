import test from "node:test";
import assert from "node:assert/strict";
import { delegateCompatibleIds, selectUniqueWikidataMappings } from "../api/catalog-delegation.js";

// Identity delegation regression coverage.

test("catalog delegation converts mapped MAL IDs to IMDb IDs", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { Page: { media: [{ id: 39535, idMal: 34134, title: { romaji: "Mushoku Tensei II", english: "Mushoku Tensei: Jobless Reincarnation Season 2 Part 2", native: "無職転生 II" }, synonyms: ["Mushoku Tensei II"], externalLinks: [{ site: "IMDb", url: "https://www.imdb.com/title/tt13293588/" }] }] } } }), { status: 200, headers: { "content-type": "application/json" } });
  try { const result = await delegateCompatibleIds([{ id: "mal:34134", type: "series", name: "Mushoku Tensei" }, { id: "mal:999999", type: "series", name: "Unmapped Anime" }]); assert.equal(result[0].id, "tt13293588"); assert.equal(result[1].id, "mal:999999"); } finally { globalThis.fetch = originalFetch; }
});

test("catalog delegation batches large MAL ID sets for AniList lookup", async () => {
  const originalFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (_url, options = {}) => { calls += 1; const ids = JSON.parse(String(options.body)).variables.ids; const media = ids.map((id) => ({ id: id + 100000, idMal: id, title: { romaji: `Anime ${id}`, english: `Anime ${id}`, native: `Anime ${id}` }, synonyms: [], externalLinks: [{ site: "IMDb", url: `https://www.imdb.com/title/tt${String(id).padStart(7, "0")}/` }], relations: { edges: [] } })); return new Response(JSON.stringify({ data: { Page: { media } } }), { status: 200, headers: { "content-type": "application/json" } }); };
  try { const input = Array.from({ length: 51 }, (_, index) => ({ id: `mal:${10000 + index}`, type: "series", name: `Anime ${10000 + index}` })); const result = await delegateCompatibleIds(input); assert.equal(calls, 2); assert.equal(result.length, 51); assert.equal(result[0].id, "tt0010000"); assert.equal(result[50].id, "tt0010050"); } finally { globalThis.fetch = originalFetch; }
});

test("catalog delegation uses AniZip when AniList has no compatible link", async () => {
  const originalFetch = globalThis.fetch; let call = 0;
  globalThis.fetch = async (_url, options = {}) => { call += 1; if (call === 1) return new Response(JSON.stringify({ data: { Page: { media: [{ id: 12345, idMal: 54321, title: { romaji: "Example Anime", english: "Example Anime", native: "例示アニメ" }, synonyms: [], externalLinks: [], relations: { edges: [] } }] } } }), { status: 200, headers: { "content-type": "application/json" } }); assert.match(String(options.method || "GET"), /^GET$/i); assert.match(_url, /mal_id=54321/); return new Response(JSON.stringify({ mappings: { imdb_id: "tt12345678" } }), { status: 200, headers: { "content-type": "application/json" } }); };
  try { const result = await delegateCompatibleIds([{ id: "mal:54321", type: "series", name: "Example Anime" }]); assert.equal(result[0].id, "tt12345678"); } finally { globalThis.fetch = originalFetch; }
});

test("catalog delegation prefers the original anime's related metadata for a season", async () => {
  const originalFetch = globalThis.fetch; let call = 0;
  globalThis.fetch = async () => { call += 1; return new Response(JSON.stringify({ data: { Page: { media: [{ id: 210031, idMal: 63832, title: { romaji: "Seihantai na Kimi to Boku Season 2", english: "You and I Are Polar Opposites Season 2", native: "正反対な君と僕 Season 2" }, synonyms: [], externalLinks: [], relations: { edges: [{ relationType: "PREQUEL", node: { id: 176923, idMal: 56966, title: { romaji: "Seihantai na Kimi to Boku", english: "You and I Are Polar Opposites", native: "正反対な君と僕" }, externalLinks: [{ site: "IMDb", url: "https://www.imdb.com/title/tt37532731/" }] } }] } }] } } }), { status: 200, headers: { "content-type": "application/json" } }); };
  try { const result = await delegateCompatibleIds([{ id: "mal:63832", type: "series", name: "You and I Are Polar Opposites Season 2" }]); assert.equal(result[0].id, "tt37532731"); assert.ok(call >= 1); } finally { globalThis.fetch = originalFetch; }
});

test("catalog delegation falls back to another related title when the first relation is unmapped", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "https://graphql.anilist.co") return new Response(JSON.stringify({ data: { Page: { media: [{ id: 300001, idMal: 70001, title: { romaji: "Example Anime Season 3", english: "Example Anime Season 3", native: "例示アニメ 第3期" }, externalLinks: [], relations: { edges: [{ relationType: "PREQUEL", node: { id: 300000, idMal: 70000, title: { romaji: "Unmapped Prequel", english: "Unmapped Prequel", native: "" }, externalLinks: [] } }, { relationType: "PARENT", node: { id: 299999, idMal: 69999, title: { romaji: "Example Anime", english: "Example Anime", native: "" }, externalLinks: [] } }] } }] } } }), { status: 200, headers: { "content-type": "application/json" } });
    assert.match(String(url), /https:\/\/api\.ani\.zip\/v1\/mappings/); const query = new URL(String(url)).search; if (query.includes("mal_id=69999")) return new Response(JSON.stringify({ mappings: { imdb_id: "tt76543210" } }), { status: 200, headers: { "content-type": "application/json" } }); return new Response(JSON.stringify({ mappings: {} }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try { const result = await delegateCompatibleIds([{ id: "mal:70001", type: "series", name: "Example Anime Season 3" }]); assert.equal(result[0].id, "tt76543210"); } finally { globalThis.fetch = originalFetch; }
});

test("catalog delegation does not accept a title-only Wikidata match", () => {
  const result = selectUniqueWikidataMappings([{ label: { value: "Example Anime" }, imdb: { value: "tt99999999" } }]);
  assert.equal(result.size, 0);
});

test("catalog delegation accepts a Wikidata mapping linked by the source MAL ID", () => {
  const result = selectUniqueWikidataMappings([{ sourceMal: { value: "54321" }, candidate: { value: "https://www.wikidata.org/entity/Q1" }, imdb: { value: "tt12345678" } }]);
  assert.equal(result.get("mal:54321"), "tt12345678");
});

test("catalog delegation inherits a verified external ID from a Wikidata parent series", () => {
  const result = selectUniqueWikidataMappings([{ sourceMal: { value: "54000" }, candidate: { value: "https://www.wikidata.org/entity/Q-parent" }, imdb: { value: "tt16255458" } }]);
  assert.equal(result.get("mal:54000"), "tt16255458");
});

test("catalog delegation preserves the source identity when no trustworthy mapping exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: { Page: { media: [] } } }), { status: 200, headers: { "content-type": "application/json" } });
  try { const input = { id: "anilist:12345", type: "series", name: "Example" }; const result = await delegateCompatibleIds([input]); assert.deepEqual(result, [input]); } finally { globalThis.fetch = originalFetch; }
});

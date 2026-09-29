import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function fetchImpl(url, options = {}) {
  const body = String(options.body || "");
  if (url.includes("api4.thetvdb.com/web/search/queries")) {
    return Promise.resolve(new Response(JSON.stringify({
      results: [{ hits: [{ id: "series-451479", type: "series", name: "らんま½ (2024)", aliases: ["Ranma 1/2 (2024)"], first_air_time: "2024-10-06", status: "Continuing" }] }],
      request: body,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  if (url.includes("mappings.anibridge") && url.includes("anilist:209872")) {
    return Promise.resolve(new Response(JSON.stringify({ data: { "anilist:209872": {} } }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  if (url.includes("arm.haglund.dev") && url.includes("source=anilist")) {
    return Promise.resolve(new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } }));
  }
  if (url.includes("kitsu.io")) {
    return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  return Promise.resolve(new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } }));
}

test.beforeEach(() => clearCanonicalizationCache());

test("accepts a continuing TVDB series for a requested later season when the base title matches", async () => {
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:209872",
    name: "Ranma1/2 (2024) Season 3",
    released: "2026-10-04T00:00:00.000Z",
    extra: {
      anilistId: "209872",
      titleEnglish: "Ranma1/2 (2024) Season 3",
      titleRomaji: "Ranma 1/2 (2024) 3rd Season",
      titleNative: "らんま1/2 (2024) 第3期",
    },
  }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:451479");
});

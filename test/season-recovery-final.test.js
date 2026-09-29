import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

test.beforeEach(() => clearCanonicalizationCache());

test("recovers a later season from its base TVDB series title", async () => {
  const fetchImpl = async (url, options = {}) => {
    if (url.includes("api4.thetvdb.com/web/search/queries")) {
      const body = String(options.body || "");
      const query = body.includes('"query":"Ranma 1/2 (2024)"');
      return new Response(JSON.stringify({ results: [{ hits: query ? [{ id: "series-451479", type: "series", name: "らんま½ (2024)", aliases: ["Ranma 1/2 (2024)"], first_air_time: "2024-10-06" }] : [] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
  };
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:209872",
    name: "Ranma1/2 (2024) Season 3",
    released: "2026-10-04T00:00:00.000Z",
    extra: { anilistId: "209872", titleEnglish: "Ranma1/2 (2024) Season 3", titleRomaji: "Ranma 1/2 (2024) 3rd Season", titleNative: "らんま1/2 (2024) 第3期" },
  }], { fetchImpl });
  assert.equal(meta.id, "tvdb:451479");
});

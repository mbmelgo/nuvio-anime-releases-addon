import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";
import { recoverContinuingTvdbSeries } from "../lib/canonical-season-recovery.js";

test.beforeEach(() => clearCanonicalizationCache());

function tvdbFetch(url, options = {}) {
  if (url.includes("api4.thetvdb.com/web/search/queries")) {
    const body = String(options.body || "");
    const query = body.includes('"query":"Ranma 1/2 (2024)"');
    return Promise.resolve(new Response(JSON.stringify({
      results: [{ hits: query ? [{ id: "series-451479", type: "series", name: "らんま½ (2024)", aliases: ["Ranma 1/2 (2024)"], first_air_time: "2024-10-06" }] : [] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
  }
  return Promise.resolve(new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } }));
}

test("recovers a later season from its base TVDB series title", async () => {
  const recovery = await recoverContinuingTvdbSeries([
    "Ranma1/2 (2024) Season 3",
    "Ranma 1/2 (2024) 3rd Season",
    "らんま1/2 (2024) 第3期",
  ], tvdbFetch);
  assert.deepEqual(recovery, { status: "found", tvdbId: "451479" });
});

test("does not treat generic series wording as a continuation marker", async () => {
  const recovery = await recoverContinuingTvdbSeries(["Pokémon Horizons: The Series"], tvdbFetch);
  assert.deepEqual(recovery, { status: "not_applicable", tvdbId: null });
});

test("uses continuation recovery before falling back to an incomplete canonical identity", async () => {
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:209872",
    name: "Ranma1/2 (2024) Season 3",
    released: "2026-10-04T00:00:00.000Z",
    extra: { anilistId: "209872", titleEnglish: "Ranma1/2 (2024) Season 3", titleRomaji: "Ranma 1/2 (2024) 3rd Season", titleNative: "らんま1/2 (2024) 第3期" },
  }], { fetchImpl: tvdbFetch, now: 1000 });
  assert.equal(meta.id, "tvdb:451479");
});

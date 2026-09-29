import assert from "node:assert/strict";
import test from "node:test";
import {
  ANILIST_PAGE_SIZE,
  buildCatalogMediaVariables,
  catalogDefinitions,
  getCatalogPageCount,
  getCatalogPagePlan,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  MAX_CATALOG_ITEMS,
} from "../api/catalog-source.js";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";
import { selectUniqueWikidataMappings } from "../api/catalog-delegation.js";

test("catalog model exposes exactly the five requested catalogs", () => {
  const catalogs = catalogDefinitions({ previous: { season: "SPRING", year: 2026 }, ongoing: { season: "SUMMER", year: 2026 }, upcoming: { season: "FALL", year: 2026 } });
  assert.deepEqual(catalogs.map((catalog) => catalog.id), ["upcoming_season", "current_season", "previous_season", "new_episodes", "upcoming_episodes"]);
  assert.equal(catalogs[0].name, "Upcoming Season — Fall 2026");
  assert.equal(catalogs[1].name, "Current Season — Summer 2026");
  assert.equal(catalogs[2].name, "Previous Season — Spring 2026");
  assert.equal(catalogs[3].name, "Latest Anime — Last 7 Days");
  assert.equal(catalogs[4].name, "Upcoming Anime — Next 7 Days");
});

test("catalog pages are intentionally small for serverless latency", () => {
  assert.equal(ANILIST_PAGE_SIZE, 10);
  assert.equal(MAX_CATALOG_ITEMS, 1000);
  assert.equal(getCatalogPageCount(0), 0);
  assert.equal(getCatalogPageCount(1), 1);
  assert.equal(getCatalogPageCount(10), 1);
  assert.equal(getCatalogPageCount(11), 2);
  assert.equal(getCatalogPageCount(1000), 100);
  assert.equal(getCatalogPageCount(1001), 100);
});

test("catalog pagination maps Nuvio skip directly to one AniList page", () => {
  assert.deepEqual(getCatalogPagePlan(0), { page: 1, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(9), { page: 1, offset: 9, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(10), { page: 2, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(20), { page: 3, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(990), { page: 100, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(1000), { page: 101, offset: 0, limit: 0 });
});

test("catalog pagination does not require a second local skip", () => {
  const firstPage = getCatalogPagePlan(0);
  const secondPage = getCatalogPagePlan(10);
  assert.equal(firstPage.offset, 0);
  assert.equal(secondPage.offset, 0);
  assert.notEqual(firstPage.page, secondPage.page);
});

test("catalog pagination is identical for search because AniList receives the search term", () => {
  assert.deepEqual(getCatalogPagePlan(0, "bleach"), { page: 1, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(10, "bleach"), { page: 2, offset: 0, limit: 10 });
  assert.deepEqual(getCatalogPagePlan(990, "bleach"), { page: 100, offset: 0, limit: 10 });
});

test("catalog search is passed to AniList instead of requiring full-season local filtering", () => {
  const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
  assert.deepEqual(buildCatalogMediaVariables(filter, 1, "  Bleach  "), { page: 1, season: "FALL", seasonYear: 2026, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"], search: "Bleach" });
  assert.deepEqual(buildCatalogMediaVariables(filter, 2, ""), { page: 2, season: "FALL", seasonYear: 2026, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] });
});

test("fast catalog identity prefers a validated TVDB mapping without invoking the full resolver", async () => {
  const metas = [{ id: "mal:62080", type: "series", name: "The Oblivious Saint Can't Contain Her Power", releaseInfo: "2026", extra: { anilistId: 196219, malId: 62080 } }];
  const calls = [];
  const result = await canonicalizeCatalogMetasFast(metas, {
    resolveTvdb: async (meta) => { calls.push(meta.extra.anilistId); return "465988"; },
  });
  assert.deepEqual(calls, [196219]);
  assert.equal(result[0].id, "tvdb:465988");
  assert.equal(result[0].extra.originalCatalogId, "mal:62080");
  assert.equal(result[0].extra.tvdbId, "465988");
});

test("fast catalog identity falls back to AniList instead of running expensive title searches", async () => {
  const metas = [{ id: "mal:53876", type: "series", name: "Pokémon Horizons", releaseInfo: "2023-", extra: { anilistId: 166254, malId: 53876 } }];
  let called = false;
  const result = await canonicalizeCatalogMetasFast(metas, { resolveTvdb: async () => { called = true; return null; } });
  assert.equal(called, true);
  assert.equal(result[0].id, "anilist:166254");
  assert.equal(result[0].extra.originalCatalogId, "mal:53876");
});

test("rolling catalog windows are exactly seven days wide", () => {
  const now = new Date("2026-09-28T06:00:00.000Z");
  const latest = getLast7DaysRangeManila(now);
  const upcoming = getNext7DaysRangeManila(now);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  assert.equal(latest.end - latest.start, sevenDays);
  assert.equal(upcoming.end - upcoming.start, sevenDays);
  assert.ok(latest.end <= now.getTime());
  assert.ok(upcoming.start >= now.getTime());
});

test("Wikidata title-only fallback does not map ambiguous or unique titles", () => {
  const result = selectUniqueWikidataMappings([
    { label: { value: "One Piece" }, imdb: { value: "tt0388629" } },
    { label: { value: "One Piece" }, imdb: { value: "tt9999999" } },
    { label: { value: "Bleach" }, imdb: { value: "tt0434661" } },
  ], new Map([["one piece", ["mal:21"]], ["bleach", ["mal:269"]]]));
  assert.equal(result.has("mal:21"), false);
  assert.equal(result.has("mal:269"), false);
});

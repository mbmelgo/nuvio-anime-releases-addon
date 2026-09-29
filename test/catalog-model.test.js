import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCatalogMediaVariables,
  catalogDefinitions,
  getCatalogPageCount,
  getCatalogPagePlan,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  MAX_CATALOG_ITEMS,
} from "../api/catalog-source.js";
import { selectUniqueWikidataMappings } from "../api/catalog-delegation.js";

test("catalog model exposes exactly the five requested catalogs", () => {
  const catalogs = catalogDefinitions({
    previous: { season: "SPRING", year: 2026 },
    ongoing: { season: "SUMMER", year: 2026 },
    upcoming: { season: "FALL", year: 2026 },
  });

  assert.deepEqual(catalogs.map((catalog) => catalog.id), [
    "upcoming_season",
    "current_season",
    "previous_season",
    "new_episodes",
    "upcoming_episodes",
  ]);
  assert.equal(catalogs[0].name, "Upcoming Season — Fall 2026");
  assert.equal(catalogs[1].name, "Current Season — Summer 2026");
  assert.equal(catalogs[2].name, "Previous Season — Spring 2026");
  assert.equal(catalogs[3].name, "Latest Anime — Last 7 Days");
  assert.equal(catalogs[4].name, "Upcoming Anime — Next 7 Days");
});

test("catalogs are exposed as a single page with up to 1000 anime", () => {
  assert.equal(MAX_CATALOG_ITEMS, 1000);
  assert.equal(getCatalogPageCount(0), 0);
  assert.equal(getCatalogPageCount(1), 1);
  assert.equal(getCatalogPageCount(50), 1);
  assert.equal(getCatalogPageCount(51), 2);
  assert.equal(getCatalogPageCount(1000), 20);
  assert.equal(getCatalogPageCount(1001), 20);
});

test("catalog pagination starts directly at the requested AniList page when no search is used", () => {
  assert.deepEqual(getCatalogPagePlan(0), { firstPage: 1, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(49), { firstPage: 1, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(50), { firstPage: 2, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(100), { firstPage: 3, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(950), { firstPage: 20, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(1000), { firstPage: 21, targetCount: 0 });
});

test("catalog search pagination starts at page one and fetches only enough matches for the requested page", () => {
  assert.deepEqual(getCatalogPagePlan(0, "bleach"), { firstPage: 1, targetCount: 50 });
  assert.deepEqual(getCatalogPagePlan(50, "bleach"), { firstPage: 1, targetCount: 100 });
  assert.deepEqual(getCatalogPagePlan(950, "bleach"), { firstPage: 1, targetCount: 1000 });
});

test("catalog search is passed to AniList instead of requiring full-season local filtering", () => {
  const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
  assert.deepEqual(buildCatalogMediaVariables(filter, 1, "  Bleach  "), {
    page: 1,
    season: "FALL",
    seasonYear: 2026,
    status: "NOT_YET_RELEASED",
    sort: ["START_DATE", "TITLE_ROMAJI"],
    search: "Bleach",
  });
  assert.deepEqual(buildCatalogMediaVariables(filter, 2, ""), {
    page: 2,
    season: "FALL",
    seasonYear: 2026,
    status: "NOT_YET_RELEASED",
    sort: ["START_DATE", "TITLE_ROMAJI"],
  });
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
  ], new Map([
    ["one piece", ["mal:21"]],
    ["bleach", ["mal:269"]],
  ]));

  assert.equal(result.has("mal:21"), false);
  assert.equal(result.has("mal:269"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRollingCatalog,
  getCatalogFilter,
  getRollingCatalogRange,
  fetchValidatedSeasonCatalogPage,
} from "../api/catalog-source.js";

function schedule(mediaId, airingAt, episode, title = `Anime ${mediaId}`) {
  return {
    id: `${mediaId}-${episode}`,
    airingAt,
    episode,
    media: {
      id: mediaId,
      title: { english: title, romaji: title, native: title },
      coverImage: { large: `https://example.test/${mediaId}.jpg` },
      status: "RELEASING",
      startDate: { year: 2026, month: 1, day: 1 },
      endDate: { year: null },
      genres: ["Action"],
    },
  };
}

test("seasonal filters remain isolated from rolling catalog ids", () => {
  const info = {
    ongoing: { season: "FALL", year: 2026 },
    previous: { season: "SUMMER", year: 2026 },
    upcoming: { season: "WINTER", year: 2027 },
  };
  assert.deepEqual(getCatalogFilter("current_season", info), { season: info.ongoing, sort: ["ID"] });
  assert.deepEqual(getCatalogFilter("previous_season", info), { season: info.previous, sort: ["ID"] });
  assert.deepEqual(getCatalogFilter("upcoming_season", info), { season: info.upcoming, sort: ["ID"] });
  assert.equal(getCatalogFilter("upcoming_5_days", info), null);
  assert.equal(getCatalogFilter("previous_7_days", info), null);
});

test("rolling ranges are exactly 5 days upcoming and 7 days previous", () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  const upcoming = getRollingCatalogRange("upcoming_5_days", now);
  const previous = getRollingCatalogRange("previous_7_days", now);
  assert.equal(upcoming.end - upcoming.start, 5 * 24 * 60 * 60 * 1000);
  assert.equal(previous.end - previous.start, 7 * 24 * 60 * 60 * 1000);
  assert.equal(upcoming.start, now.getTime());
  assert.equal(previous.end, now.getTime());
});

test("upcoming rolling catalog deduplicates anime while preserving schedule order", async () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  const rows = [
    schedule(10, now.getTime() + 60_000, 2),
    schedule(20, now.getTime() + 120_000, 1),
    schedule(10, now.getTime() + 180_000, 3),
    schedule(30, now.getTime() + 240_000, 1),
  ];
  const result = await buildRollingCatalog("upcoming_5_days", now, 0, "", {
    fetchPage: async () => rows,
    maxPages: 1,
  });
  assert.deepEqual(result.map((meta) => meta.id), ["anilist:10", "anilist:20", "anilist:30"]);
  assert.equal(result[0].extra.nextEpisode, 2);
  assert.equal(result[0].extra.nextAiringAt, rows[0].airingAt);
});

test("previous rolling catalog keeps most-recent schedule order and deduplicates anime", async () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  const rows = [
    schedule(30, now.getTime() - 60_000, 4),
    schedule(10, now.getTime() - 120_000, 9),
    schedule(30, now.getTime() - 180_000, 3),
    schedule(20, now.getTime() - 240_000, 7),
  ];
  const result = await buildRollingCatalog("previous_7_days", now, 0, "", {
    fetchPage: async () => rows,
    maxPages: 1,
  });
  assert.deepEqual(result.map((meta) => meta.id), ["anilist:30", "anilist:10", "anilist:20"]);
});

test("rolling pagination fills a Nuvio page across schedule pages after deduplication", async () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  const pages = [
    [schedule(1, now.getTime() + 1, 1), schedule(1, now.getTime() + 2, 2), schedule(2, now.getTime() + 3, 1)],
    [schedule(3, now.getTime() + 4, 1), schedule(2, now.getTime() + 5, 2), schedule(4, now.getTime() + 6, 1)],
  ];
  const calls = [];
  const result = await buildRollingCatalog("upcoming_5_days", now, 0, "", {
    fetchPage: async (start, end, futureOnly, page, sort) => {
      calls.push({ start, end, futureOnly, page, sort });
      return pages[page - 1] || [];
    },
    maxPages: 2,
    pageSize: 4,
  });
  assert.deepEqual(result.map((meta) => meta.id), ["anilist:1", "anilist:2", "anilist:3", "anilist:4"]);
  assert.deepEqual(calls.map((call) => [call.page, call.futureOnly, call.sort]), [[1, true, "TIME"], [2, true, "TIME"]]);
});

test("rolling search is applied before logical pagination so later schedule pages can fill the result", async () => {
  const now = new Date("2026-10-01T00:00:00.000Z");
  const pages = [
    [schedule(1, now.getTime() + 1, 1, "Other Anime"), schedule(2, now.getTime() + 2, 1, "Target Anime")],
    [schedule(3, now.getTime() + 3, 1, "Target Anime 2")],
  ];
  const calls = [];
  const result = await buildRollingCatalog("upcoming_5_days", now, 0, "target", {
    fetchPage: async (...args) => {
      calls.push(args[3]);
      return pages[args[3] - 1] || [];
    },
    maxPages: 2,
    pageSize: 2,
  });
  assert.deepEqual(result.map((meta) => meta.name), ["Target Anime", "Target Anime 2"]);
  assert.deepEqual(calls, [1, 2]);
});

test("seasonal pagination remains the existing direct AniList-page mapping", async () => {
  const calls = [];
  const result = await fetchValidatedSeasonCatalogPage({
    filter: { season: { season: "FALL", year: 2026 }, sort: ["ID"] },
    skip: 50,
    fetchPage: async (_filter, page) => {
      calls.push(page);
      return [{ id: page * 100 + 1 }, { id: page * 100 + 2 }];
    },
    canonicalizePage: async (rows) => rows.map((row) => ({ id: `anilist:${row.id}` })),
  });
  assert.deepEqual(calls, [2]);
  assert.deepEqual(result, [{ id: "anilist:201" }, { id: "anilist:202" }]);
});

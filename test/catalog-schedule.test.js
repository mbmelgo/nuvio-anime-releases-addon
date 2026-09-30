import assert from "node:assert/strict";
import test from "node:test";
import { scheduleCatalog, selectScheduleMetas, selectSchedulePage } from "../lib/catalog-schedule.js";

function schedule(id, airingAt, episode, title = id) {
  return {
    id: `${id}-${airingAt}`,
    airingAt,
    episode,
    media: {
      id: Number(id),
      idMal: Number(id) + 1000,
      format: "TV",
      title: { english: title, romaji: title, native: title },
      coverImage: { large: `https://example.com/${id}.jpg` },
      status: "RELEASING",
      startDate: { year: 2026, month: 1, day: 1 },
      endDate: null,
    },
  };
}

const identityCanonicalize = async (metas) => metas;

test("latest schedule keeps one anime at its newest airing event", () => {
  const result = selectScheduleMetas([
    schedule("1", 100, 1, "Anime One"),
    schedule("1", 200, 2, "Anime One"),
    schedule("2", 150, 1, "Anime Two"),
  ], false);

  assert.deepEqual(result.map((meta) => meta.name), ["Anime One", "Anime Two"]);
  assert.deepEqual(result.map((meta) => meta.extra.episode), [2, 1]);
});

test("upcoming schedule keeps one anime at its next airing event", () => {
  const result = selectScheduleMetas([
    schedule("1", 300, 3, "Anime One"),
    schedule("1", 200, 2, "Anime One"),
    schedule("2", 250, 1, "Anime Two"),
  ], true);

  assert.deepEqual(result.map((meta) => meta.name), ["Anime One", "Anime Two"]);
  assert.deepEqual(result.map((meta) => meta.extra.episode), [2, 1]);
});

test("schedule page returns fewer than 50 unique anime without requesting another AniList page", async () => {
  const schedules = [];
  for (let index = 1; index <= 20; index++) {
    schedules.push(schedule(String(index), index, 1, `Anime ${index}`));
  }
  schedules.push(schedule("1", 999, 2, "Anime 1"));

  const calls = [];
  const result = await scheduleCatalog(0, 1000, false, 0, "", async (...args) => {
    calls.push(args);
    return schedules;
  }, identityCanonicalize);

  assert.equal(calls.length, 1);
  assert.equal(result.length, 20);
});

test("schedule pages request the next 50-event batch for Nuvio skip 50", async () => {
  const calls = [];
  const result = await scheduleCatalog(0, 1000, false, 50, "", async (...args) => {
    calls.push(args);
    return [schedule("51", 51, 1, "Anime 51")];
  }, identityCanonicalize);

  assert.equal(calls.length, 1);
  assert.equal(calls[0][3], 2);
  assert.equal(result.length, 1);
});

test("schedule page deduplicates repeated airing events before applying the page limit", () => {
  const schedules = [];
  for (let index = 1; index <= 12; index++) {
    schedules.push(schedule(String(index), index, 1, `Anime ${index}`));
  }
  schedules.push(schedule("1", 999, 2, "Anime 1"));

  const page = selectSchedulePage(schedules, false, 0);
  assert.equal(page.length, 12);
  assert.equal(new Set(page.map((meta) => meta.extra.anilistId)).size, 12);
  assert.equal(page[0].name, "Anime 1");
});

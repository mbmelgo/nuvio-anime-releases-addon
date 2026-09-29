import assert from "node:assert/strict";
import test from "node:test";
import { selectScheduleMetas, selectSchedulePage } from "../lib/catalog-schedule.js";

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

test("schedule pages can be filled from multiple AniList event pages without duplicates", () => {
  const schedules = [];
  for (let index = 1; index <= 12; index++) {
    schedules.push(schedule(String(index), index, 1, `Anime ${index}`));
  }
  schedules.push(schedule("1", 999, 2, "Anime 1"));

  const page = selectSchedulePage(schedules, false, 0);
  assert.equal(page.length, 10);
  assert.deepEqual(page.map((meta) => meta.name), [
    "Anime 1", "Anime 12", "Anime 11", "Anime 10", "Anime 9", "Anime 8", "Anime 7", "Anime 6", "Anime 5", "Anime 4",
  ]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { mergeUpcomingVideos } from "../lib/upcoming.js";

const FUTURE = Math.floor(Date.now() / 1000) + 86400;

test("adds future airing episodes as unreleased videos", () => {
  const result = mergeUpcomingVideos([], [
    { episode: 49, airingAt: FUTURE },
    { episode: 50, airingAt: FUTURE + 86400 }
  ], 2, "mal:123");
  assert.deepEqual(result.map(video => [video.season, video.episode, video.released]), [
    [2, 49, new Date(FUTURE * 1000).toISOString()],
    [2, 50, new Date((FUTURE + 86400) * 1000).toISOString()]
  ]);
  assert.equal(result[0].title, "Episode 49");
  assert.equal(result[0].id, "mal:123:2:49");
});

test("does not duplicate an episode already present in the metadata", () => {
  const existing = [{ id: "tt123:2:49", title: "The Blade", season: 2, episode: 49 }];
  const result = mergeUpcomingVideos(existing, [{ episode: 49, airingAt: FUTURE }], 2, "mal:123");
  assert.equal(result.length, 1);
  assert.equal(result[0].title, "The Blade");
});

test("does not add episodes whose airing time has already passed", () => {
  const result = mergeUpcomingVideos([], [{ episode: 49, airingAt: Math.floor(Date.now() / 1000) - 60 }], 2, "mal:123");
  assert.equal(result.length, 0);
});

test("keeps existing released and upcoming videos sorted by season and episode", () => {
  const result = mergeUpcomingVideos([
    { id: "mal:123:2:48", title: "Episode 48", season: 2, episode: 48, released: new Date(Date.now() - 86400000).toISOString() }
  ], [{ episode: 50, airingAt: FUTURE }, { episode: 49, airingAt: FUTURE }], 2, "mal:123");
  assert.deepEqual(result.map(video => video.episode), [48, 49, 50]);
});

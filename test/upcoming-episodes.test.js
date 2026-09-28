import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAniZipEpisode, normalizeJikanEpisode } from "../lib/episodes.js";

test("preserves an announced future AniZip episode with its release date", () => {
  const future = normalizeAniZipEpisode({
    episodeNumber: 50,
    seasonNumber: 2,
    title: "Episode 50",
    airDate: "2026-10-27T00:00:00Z"
  });
  assert.equal(future?.number, 50);
  assert.equal(future?.sourceSeason, 2);
  assert.equal(future?.released, "2026-10-27T00:00:00.000Z");
});

test("preserves an announced future Jikan episode with its air date", () => {
  const future = normalizeJikanEpisode({
    mal_id: 50,
    title: "The Blade",
    aired: { from: "2026-10-20T00:00:00+00:00" }
  });
  assert.equal(future?.number, 50);
  assert.equal(future?.released, "2026-10-20T00:00:00.000Z");
});

test("does not discard future episodes while still filtering undated generic placeholders", () => {
  const future = normalizeAniZipEpisode({
    episodeNumber: 49,
    seasonNumber: 2,
    title: "The Blade",
    airDate: "2026-10-20T00:00:00Z"
  });
  const undated = normalizeAniZipEpisode({
    episodeNumber: 50,
    seasonNumber: 2,
    title: "Episode 50"
  });
  assert.ok(future);
  assert.equal(undated, null);
});

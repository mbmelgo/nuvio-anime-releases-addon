import test from "node:test";
import assert from "node:assert/strict";
import { enrichMeta, formatReleaseInfo, normalizeCertification } from "../api/lib/rich-meta.js";

test("rich metadata maps show details, certification, cast, trailer, and season posters", () => {
  const meta = {
    id: "mal:39535",
    type: "series",
    name: "Mushoku Tensei",
    videos: [
      { id: "a:1:1", title: "Episode 1", season: 1, episode: 1 },
      { id: "a:2:1", title: "Episode 1", season: 2, episode: 1 },
    ],
  };
  const root = {
    aired: { from: "2021-01-11T00:00:00+00:00", to: null },
    status: "Currently Airing",
    duration: 24,
    rating: "R - 17+ (violence & profanity)",
    trailer: { youtube_id: "abc123" },
    characters: [
      {
        character: { name: "Rudeus Greyrat", images: { jpg: { image_url: "https://example.com/character.jpg" } } },
        voice_actors: [
          { language: "Japanese", person: { name: "Tomokazu Sugita", images: { jpg: { image_url: "https://example.com/actor.jpg" } } } },
        ],
      },
    ],
    images: { jpg: { large_image_url: "https://example.com/season1.jpg" } },
  };
  const rootAniList = {
    countryOfOrigin: "JP",
    bannerImage: "https://example.com/banner.jpg",
    coverImage: { extraLarge: "https://example.com/root-cover.jpg" },
  };
  const seasons = [
    { season: 1, entries: [{ node: rootAniList, jikan: root }] },
    { season: 2, entries: [{ node: { coverImage: { extraLarge: "https://example.com/season2.jpg" } }, jikan: {} }] },
  ];

  const result = enrichMeta(meta, root, rootAniList, seasons);

  assert.equal(result.releaseInfo, "2021-");
  assert.equal(result.status, "Currently Airing");
  assert.equal(result.runtime, "24m");
  assert.equal(result.country, "JP");
  assert.equal(result.language, "Japanese");
  assert.equal(result.background, "https://example.com/banner.jpg");
  assert.equal(result.ageRating, "R");
  assert.deepEqual(result.cast, ["Tomokazu Sugita"]);
  assert.equal(result.app_extras.certificationLocal, "R");
  assert.equal(result.app_extras.cast[0].character, "Rudeus Greyrat");
  assert.equal(result.app_extras.cast[0].photo, "https://example.com/actor.jpg");
  assert.equal(result.trailers[0].key, "abc123");
  assert.deepEqual(result.app_extras.seasonPosters, {
    "1": "https://example.com/season1.jpg",
    "2": "https://example.com/season2.jpg",
  });
  assert.equal(result.videos[0].seasonPoster, "https://example.com/season1.jpg");
  assert.equal(result.videos[1].seasonPoster, "https://example.com/season2.jpg");
});

test("release info preserves an airing series as an open-ended range", () => {
  assert.equal(formatReleaseInfo("2021-01-01T00:00:00Z", null), "2021-");
});

test("certification normalization does not fabricate missing ratings", () => {
  assert.equal(normalizeCertification("None"), null);
  assert.equal(normalizeCertification("R+ - Mild Nudity"), "R+");
  assert.equal(normalizeCertification("PG-13 - Teens 13 or older"), "PG-13");
});

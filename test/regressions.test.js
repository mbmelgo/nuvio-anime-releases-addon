import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEpisodeSequences, looksLikeSameSequence } from "../api/lib/episode-sequences.js";
import { isSpecial } from "../api/lib/episodes.js";
import { numberSeasons } from "../api/meta-resolver-v5.js";

const titles = (prefix, count) =>
  Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: `${prefix} Episode ${index + 1}`,
    released: `2024-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
  }));

test("Attack on Titan regression: identical alternate episode sequences are reconciled, not appended", () => {
  const first = titles("Town", 10);
  const alternate = first.map((row) => ({ ...row, thumbnail: `https://cdn.example/${row.number}.jpg` }));

  assert.equal(looksLikeSameSequence(first, alternate), true);

  const result = reconcileEpisodeSequences([
    { identity: "mal:16498", rows: first },
    { identity: "mal:99999", rows: alternate },
  ]);

  assert.equal(result.length, 10);
  assert.deepEqual(result.map((row) => row.canonicalNumber), Array.from({ length: 10 }, (_, i) => i + 1));
  assert.ok(result.every((row) => row.thumbnail));
});

test("Attack on Titan regression: distinct split-cour sequences remain separate and continue numbering", () => {
  const first = titles("Part One", 10);
  const second = titles("Part Two", 10);

  assert.equal(looksLikeSameSequence(first, second), false);

  const result = reconcileEpisodeSequences([
    { identity: "cour-1", rows: first },
    { identity: "cour-2", rows: second },
  ]);

  assert.equal(result.length, 20);
  assert.deepEqual(result.map((row) => row.canonicalNumber), Array.from({ length: 20 }, (_, i) => i + 1));
});

test("One Piece regression: ordinary use of the word special is not enough to reject an episode", () => {
  assert.equal(isSpecial({ episodeNumber: 1 }, "A Special Moment"), false);
  assert.equal(isSpecial({ episodeNumber: 1 }, "Episode 1000 Special Broadcast"), true);
});

test("One Piece regression: explicit special flags still override a normal-looking title", () => {
  assert.equal(isSpecial({ episodeNumber: 1, type: "special" }, "Normal Title"), true);
  assert.equal(isSpecial({ episodeNumber: 1, seasonNumber: 0 }, "Normal Title"), true);
});

test("Naruto regression fixture: the root and sequel entries each remain represented in their own season", () => {
  const entries = [
    {
      jikan: { mal_id: 20, title: "Naruto", episodes: 220 },
      node: { title: { english: "Naruto" }, startDate: { year: 2002, month: 10, day: 3 } }
    },
    {
      jikan: { mal_id: 1735, title: "Naruto: Shippuden", episodes: 500 },
      node: { title: { english: "Naruto: Shippuden" }, startDate: { year: 2007, month: 2, day: 15 } }
    },
    {
      jikan: { mal_id: 39587, title: "Boruto: Naruto Next Generations", episodes: 293 },
      node: { title: { english: "Boruto: Naruto Next Generations" }, startDate: { year: 2017, month: 4, day: 5 } }
    }
  ];

  const groups = numberSeasons(entries, 20);

  assert.deepEqual(groups.map((group) => group.season), [1, 2, 3]);
  assert.deepEqual(groups.map((group) => group.entries[0].jikan.mal_id), [20, 1735, 39587]);
  assert.deepEqual(groups.map((group) => group.entries[0].jikan.episodes), [220, 500, 293]);
});

test("Mushoku Tensei regression fixture: explicit season names remain authoritative", () => {
  const entries = [
    {
      jikan: { mal_id: 39535, title: "Mushoku Tensei: Jobless Reincarnation", episodes: 23 },
      node: { title: { english: "Mushoku Tensei: Jobless Reincarnation Season 1" }, startDate: { year: 2021, month: 1, day: 11 } }
    },
    {
      jikan: { mal_id: 45576, title: "Mushoku Tensei II", episodes: 24 },
      node: { title: { english: "Mushoku Tensei II: Jobless Reincarnation Season 2" }, startDate: { year: 2023, month: 7, day: 3 } }
    }
  ];

  const groups = numberSeasons(entries, 39535);
  assert.deepEqual(groups.map((group) => group.season), [1, 2]);
  assert.deepEqual(groups.map((group) => group.entries[0].jikan.episodes), [23, 24]);
});

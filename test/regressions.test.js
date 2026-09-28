import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEpisodeSequences, looksLikeSameSequence } from "../api/lib/episode-sequences.js";
import { isSpecial, normalizeAniZipEpisode } from "../api/lib/episodes.js";
import { numberSeasons, chooseRows, getReleaseInfo } from "../api/meta-resolver-v5.js";

const titles = (prefix, count, start = 1) =>
  Array.from({ length: count }, (_, index) => ({
    number: start + index,
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

test("Attack on Titan regression: offset duplicate sequences are recognized by episode identity, not only episode number", () => {
  const first = titles("Town", 12, 1);
  const shifted = titles("Town", 12, 13);

  assert.equal(looksLikeSameSequence(first, shifted), true);
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
  assert.equal(isSpecial({ episodeNumber: 1 }, "A Special Moment"), false);
});

test("One Piece regression: explicit special flags still override a normal-looking title", () => {
  assert.equal(isSpecial({ episodeNumber: 1, type: "special" }, "Normal Title"), true);
  assert.equal(isSpecial({ episodeNumber: 1, seasonNumber: 0 }, "Normal Title"), true);
});

test("One Piece regression: future episodes are excluded from normalized output", () => {
  const future = normalizeAniZipEpisode({
    episodeNumber: 9999,
    seasonNumber: 1,
    title: "Future Episode",
    airDateUtc: "2099-01-01T00:00:00.000Z",
  });

  assert.equal(future, null);
});

test("One Piece regression: absolute episode numbering can be used when provider season numbering is misleading", () => {
  const result = reconcileEpisodeSequences([
    {
      identity: "mal:21",
      rows: [
        { number: 1, absoluteEpisodeNumber: 1, title: "Episode 1" },
        { number: 2, absoluteEpisodeNumber: 2, title: "Episode 2" },
        { number: 197, absoluteEpisodeNumber: 197, title: "Episode 197" },
      ],
    },
  ]);

  assert.deepEqual(result.map((row) => row.canonicalNumber), [1, 2, 3]);
});

test("One Piece regression: an incomplete Jikan tranche does not beat a complete AniZip sequence", () => {
  const jikan = titles("Jikan", 100);
  const aniZip = titles("AniZip", 1200);

  const result = chooseRows(jikan, aniZip, 1200);
  assert.equal(result.length, 1200);
  assert.equal(result[0].title, "AniZip Episode 1");
  assert.equal(result.at(-1).number, 1200);
});

test("Episode source regression: a complete Jikan sequence remains authoritative when AniZip has extras", () => {
  const jikan = titles("Jikan", 24);
  const aniZip = titles("AniZip", 25);

  const result = chooseRows(jikan, aniZip, 24);
  assert.equal(result.length, 24);
  assert.equal(result[0].title, "Jikan Episode 1");
  assert.equal(result.at(-1).number, 24);
});

test("Episode identity regression: reconciled rows retain the source identity needed for stable Nuvio IDs", () => {
  const result = reconcileEpisodeSequences([
    { identity: "mal:1535", rows: [{ number: 1, title: "Pilot" }] },
  ]);

  assert.equal(result[0].identity, "mal:1535");
});

test("Naruto regression fixture: separately titled sequels do not become seasons of the requested MAL entry", () => {
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

  assert.deepEqual(groups.map((group) => group.season), [1]);
  assert.deepEqual(groups.flatMap((group) => group.entries.map((entry) => entry.jikan.mal_id)), [20]);
  assert.deepEqual(groups.map((group) => group.entries[0].jikan.episodes), [220]);
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

test("release range regression: end year comes from resolved episode dates, not root MAL year", () => {
  const root = { aired: { from: "2013-04-07T00:00:00.000Z" } };
  const videos = [
    { released: "2013-04-07T00:00:00.000Z" },
    { released: "2019-07-01T00:00:00.000Z" },
    { released: "2023-11-04T00:00:00.000Z" },
  ];

  assert.equal(getReleaseInfo(root, videos), "2013-2023");
});

test("reconciled episode rows retain canonical numbering and source identity", () => {
  const result = reconcileEpisodeSequences([
    { identity: "mal:1535", rows: [{ number: 1, title: "Pilot" }, { number: 2, title: "Confrontation" }] }
  ]);
  assert.deepEqual(result.map((row) => row.canonicalNumber), [1, 2]);
  assert.deepEqual(result.map((row) => row.title), ["Pilot", "Confrontation"]);
});

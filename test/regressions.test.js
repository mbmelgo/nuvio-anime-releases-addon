import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEpisodeSequences, looksLikeSameSequence } from "../api/lib/episode-sequences.js";
import { isSpecial, normalizeAniZipEpisode } from "../api/lib/episodes.js";
import { numberSeasons, chooseRows, getReleaseInfo, isOngoing, mergeFreshAbsoluteEpisodes } from "../api/meta-resolver-v5.js";

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

test("One Piece regression: provider seasons may reuse episode numbers without collapsing rows", () => {
  const result = reconcileEpisodeSequences([
    {
      identity: "tt0388629",
      rows: [
        { number: 1, sourceSeason: 1, title: "First Season Episode 1" },
        { number: 2, sourceSeason: 1, title: "First Season Episode 2" },
        { number: 1, sourceSeason: 2, title: "Second Season Episode 1" },
        { number: 2, sourceSeason: 2, title: "Second Season Episode 2" },
      ],
    },
  ]);

  assert.equal(result.length, 4);
  assert.deepEqual(result.map((row) => row.canonicalNumber), [1, 2, 3, 4]);
  assert.deepEqual(result.map((row) => row.sourceSeason), [1, 1, 2, 2]);
});


test("One Piece regression: undated generic placeholder episodes are excluded", () => {
  const result = normalizeAniZipEpisode({
    episodeNumber: 1181,
    seasonNumber: 1,
    title: "Episode 1181",
  });

  assert.equal(result, null);
});

test("Ongoing-state regression: missing end dates do not make finished anime ongoing", () => {
  assert.equal(isOngoing({ status: "Finished Airing", airing: false, aired: { from: "2023-01-01T00:00:00.000Z", to: null } }), false);
  assert.equal(isOngoing({ status: "Currently Airing", airing: true, aired: { from: "2026-01-01T00:00:00.000Z", to: null } }), true);
});

test("One Piece regression: an incomplete Jikan tranche does not beat a complete AniZip sequence", () => {
  const jikan = titles("Jikan", 100);
  const aniZip = titles("AniZip", 1200);

  const result = chooseRows(jikan, aniZip, 1200);
  assert.equal(result.length, 1200);
  assert.equal(result[0].title, "AniZip Episode 1");
  assert.equal(result.at(-1).number, 1200);
});

test("One Piece freshness regression: newer absolute episodes from a fallback source fill a stale ongoing sequence", () => {
  const primary = [
    { number: 1155, sourceSeason: 23, absoluteEpisodeNumber: 1155, title: "Episode 1155" },
    { number: 1156, sourceSeason: 23, absoluteEpisodeNumber: 1156, title: "Episode 1156" }
  ];
  const fallback = [
    { number: 25, sourceSeason: 2026, absoluteEpisodeNumber: 1157, title: "Episode 1157" },
    { number: 26, sourceSeason: 2026, absoluteEpisodeNumber: 1158, title: "Episode 1158" }
  ];

  const result = mergeFreshAbsoluteEpisodes(primary, fallback, 23);

  assert.deepEqual(result.map((row) => row.absoluteEpisodeNumber), [1155, 1156, 1157, 1158]);
  assert.deepEqual(result.slice(-2).map((row) => row.sourceSeason), [23, 23]);
});

test("One Piece regression: ongoing anime prefers a longer AniZip sequence even when Jikan reports its tranche as complete", () => {
  const jikan = titles("Jikan", 100);
  const aniZip = titles("AniZip", 1200);

  const result = chooseRows(jikan, aniZip, 100, true);
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


test("Bleach regression fixture: a marked sequel chain is grouped after the requested series", () => {
  const entries = [
    {
      jikan: { mal_id: 269, title: "Bleach", episodes: 366 },
      node: { title: { english: "Bleach" }, startDate: { year: 2004, month: 10, day: 5 } }
    },
    {
      jikan: { mal_id: 41467, title: "Bleach: Thousand-Year Blood War", episodes: 13 },
      node: {
        title: { english: "Bleach: Thousand-Year Blood War" },
        startDate: { year: 2022, month: 10, day: 11 },
        relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 269 } }] }
      }
    },
    {
      jikan: { mal_id: 53998, title: "BLEACH: Sennen Kessen-hen - Ketsubetsu-tan", episodes: 13 },
      node: {
        title: { english: "BLEACH: Sennen Kessen-hen - Ketsubetsu-tan" },
        startDate: { year: 2023, month: 7, day: 8 },
        relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 41467 } }] }
      }
    }
  ];

  const groups = numberSeasons(entries, 269);
  assert.deepEqual(groups.map(group => group.season), [1, 2, 3]);
  assert.deepEqual(groups.flatMap(group => group.entries.map(entry => entry.jikan.mal_id)), [269, 41467, 53998]);
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

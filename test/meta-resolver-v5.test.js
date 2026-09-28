import test from "node:test";
import assert from "node:assert/strict";
import { chooseRows, isSeasonContinuation, numberSeasons, parseMalId } from "../api/meta-resolver-v5.js";

test("parses canonical and numeric MAL IDs", () => {
  assert.equal(parseMalId("mal:39535"), 39535);
  assert.equal(parseMalId("MAL:21"), 21);
  assert.equal(parseMalId("21"), 21);
  assert.equal(parseMalId("tt13293588"), 0);
});

test("chooses a complete Jikan sequence when it meets the expected count", () => {
  const jikan = Array.from({ length: 3 }, (_, i) => ({ number: i + 1, title: `J${i + 1}` }));
  const aniZip = Array.from({ length: 2 }, (_, i) => ({ number: i + 1, title: `A${i + 1}` }));
  assert.deepEqual(chooseRows(jikan, aniZip, 3), jikan);
});

test("chooses AniZip when Jikan is incomplete", () => {
  const jikan = [{ number: 1, title: "J1" }];
  const aniZip = [{ number: 1, title: "A1" }, { number: 2, title: "A2" }, { number: 3, title: "A3" }];
  assert.equal(chooseRows(jikan, aniZip, 3).length, 3);
});

test("groups explicit season names correctly", () => {
  const entries = [
    { jikan: { mal_id: 100, title: "Show", episodes: 12 }, node: { title: { english: "Show Season 1" }, startDate: { year: 2020, month: 1, day: 1 } } },
    { jikan: { mal_id: 101, title: "Show Season 2", episodes: 12 }, node: { title: { english: "Show Season 2" }, startDate: { year: 2021, month: 1, day: 1 } } }
  ];
  const groups = numberSeasons(entries, 100);
  assert.deepEqual(groups.map(g => g.season), [1, 2]);
  assert.deepEqual(groups.map(g => g.entries[0].jikan.mal_id), [100, 101]);
});

test("keeps split cour/part entries in the same season", () => {
  const entries = [
    { jikan: { mal_id: 200 }, node: { title: { english: "Show Part 1" }, startDate: { year: 2022, month: 1, day: 1 } } },
    { jikan: { mal_id: 201 }, node: { title: { english: "Show Part 2" }, startDate: { year: 2022, month: 7, day: 1 } } }
  ];
  const groups = numberSeasons(entries, 200);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].entries.length, 2);
});

test("does not treat a separately titled sequel as a season of the requested MAL entry", () => {
  const root = { title: { english: "Naruto" } };
  const shippuden = { title: { english: "Naruto: Shippuden" } };
  assert.equal(isSeasonContinuation(root, shippuden), false);
  const entries = [
    { jikan: { mal_id: 20, title: "Naruto" }, node: root },
    { jikan: { mal_id: 1735, title: "Naruto: Shippuden" }, node: shippuden },
    { jikan: { mal_id: 34572, title: "Boruto: Naruto Next Generations" }, node: { title: { english: "Boruto: Naruto Next Generations" } } }
  ];
  const groups = numberSeasons(entries, 20);
  assert.deepEqual(groups.flatMap(g => g.entries.map(x => x.jikan.mal_id)), [20]);
});

test("recognizes Final Season titles as continuations", () => {
  const root = { title: { english: "Attack on Titan" } };
  const continuation = { title: { english: "Attack on Titan: The Final Season" } };
  assert.equal(isSeasonContinuation(root, continuation), true);

  const entries = [
    { jikan: { mal_id: 16498, title: "Attack on Titan", episodes: 25 }, node: { ...root, startDate: { year: 2013, month: 4, day: 7 } } },
    { jikan: { mal_id: 40028, title: "Attack on Titan: The Final Season", episodes: 16 }, node: { ...continuation, startDate: { year: 2020, month: 12, day: 7 } } }
  ];
  const groups = numberSeasons(entries, 16498);
  assert.deepEqual(groups.map(group => group.season), [1, 2]);
  assert.deepEqual(groups.flatMap(group => group.entries.map(entry => entry.jikan.mal_id)), [16498, 40028]);
});

test("recognizes explicit season and part titles as continuations", () => {
  const root = { title: { english: "Mushoku Tensei: Jobless Reincarnation" } };
  assert.equal(isSeasonContinuation(root, { title: { english: "Mushoku Tensei: Jobless Reincarnation Season 2" } }), true);
  assert.equal(isSeasonContinuation(root, { title: { english: "Mushoku Tensei II: Isekai Ittara Honki Dasu" } }), true);
  assert.equal(isSeasonContinuation(root, { title: { english: "Mushoku Tensei: Jobless Reincarnation Cour 2" } }), true);
});

test("follows a parent-side sequel relation through a continuation chain", () => {
  const root = { title: { english: "Parent Show" } };
  const continuation = { title: { english: "Parent Show Season 2" } };
  const nextContinuation = { title: { english: "Parent Show: Later Arc" } };
  const entries = [
    { jikan: { mal_id: 100, title: "Parent Show", episodes: 12 }, node: { ...root, startDate: { year: 2020, month: 1, day: 1 } } },
    { jikan: { mal_id: 101, title: "Parent Show Season 2", episodes: 12 }, node: { ...continuation, startDate: { year: 2021, month: 1, day: 1 } } },
    { jikan: { mal_id: 102, title: "Parent Show: Later Arc", episodes: 12 }, node: { ...nextContinuation, startDate: { year: 2022, month: 1, day: 1 } } }
  ];
  entries[0].node.relations = { edges: [{ relationType: "SEQUEL", node: { idMal: 101 } }] };
  entries[1].node.relations = { edges: [{ relationType: "SEQUEL", node: { idMal: 102 } }] };
  const groups = numberSeasons(entries, 100);
  assert.deepEqual(groups.map(group => group.entries.map(entry => entry.jikan.mal_id)), [[100], [101], [102]]);
});

test("recognizes higher Roman-numeral season titles as continuations", () => {
  const root = { title: { english: "Saga" } };
  assert.equal(isSeasonContinuation(root, { title: { english: "Saga VI" } }), true);
  assert.equal(isSeasonContinuation(root, { title: { english: "Saga X" } }), true);
});

test("does not treat an ordinary standalone I in a title as a Roman numeral season marker", () => {
  const root = { title: { english: "The Show" } };
  const ordinary = { title: { english: "The Show I Love" } };
  assert.equal(isSeasonContinuation(root, ordinary), false);
});

test("groups the original season first when the requested entry is a later season", () => {
  const entries = [
    { jikan: { mal_id: 59193, title: "Mushoku Tensei III: Isekai Ittara Honki Dasu" }, node: { title: { english: "Mushoku Tensei III: Isekai Ittara Honki Dasu" }, startDate: { year: 2026, month: 7, day: 1 }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 51179 } }] } } },
    { jikan: { mal_id: 51179, title: "Mushoku Tensei II: Isekai Ittara Honki Dasu" }, node: { title: { english: "Mushoku Tensei II: Isekai Ittara Honki Dasu" }, startDate: { year: 2023, month: 7, day: 1 }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 45576 } }] } } },
    { jikan: { mal_id: 45576, title: "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2" }, node: { title: { english: "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2" }, startDate: { year: 2021, month: 10, day: 1 }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 39535 } }] } } },
    { jikan: { mal_id: 39535, title: "Mushoku Tensei: Isekai Ittara Honki Dasu" }, node: { title: { english: "Mushoku Tensei: Isekai Ittara Honki Dasu" }, startDate: { year: 2021, month: 1, day: 1 } } }
  ];
  const groups = numberSeasons(entries, 59193);
  assert.deepEqual(groups.map(group => group.season), [1, 2, 3]);
  assert.deepEqual(groups.map(group => group.entries.map(entry => entry.jikan.mal_id)), [[39535, 45576], [51179], [59193]]);
});

test("recovers an unmarked Season 1 when the requested entry is Season 2", () => {
  const season1 = { title: { english: "Hell Mode: Yarikomi Suki no Gamer wa Hai Settei no Isekai de Musou Suru" }, startDate: { year: 2024, month: 1, day: 1 } };
  const season2 = { title: { english: "Hell Mode Season 2" }, startDate: { year: 2026, month: 1, day: 1 }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 1 } }] } };
  const entries = [
    { jikan: { mal_id: 1, title: season1.title.english }, node: season1 },
    { jikan: { mal_id: 2, title: season2.title.english }, node: season2 }
  ];
  assert.equal(isSeasonContinuation(season2, season1, { mal_id: 2 }, { mal_id: 1 }), true);
  const groups = numberSeasons(entries, 2);
  assert.deepEqual(groups.map(group => group.entries.map(entry => entry.jikan.mal_id)), [[1], [2]]);
});

test("recovers an unmarked Season 1 for differently formatted later-season titles", () => {
  const cases = [
    [10, "Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs", 11, "Trapped in a Dating Sim Season 2"],
    [20, "From Old Country Bumpkin to Master Swordsman", 21, "From Old Country Bumpkin to Master Swordsman II"]
  ];
  for (const [s1Id, s1Title, s2Id, s2Title] of cases) {
    const entries = [
      { jikan: { mal_id: s1Id, title: s1Title }, node: { title: { english: s1Title }, startDate: { year: 2024, month: 1, day: 1 } } },
      { jikan: { mal_id: s2Id, title: s2Title }, node: { title: { english: s2Title }, startDate: { year: 2026, month: 1, day: 1 }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: s1Id } }] } } }
    ];
    assert.equal(isSeasonContinuation(entries[1].node, entries[0].node, entries[1].jikan, entries[0].jikan), true);
    const groups = numberSeasons(entries, s2Id);
    assert.deepEqual(groups.map(group => group.entries.map(entry => entry.jikan.mal_id)), [[s1Id], [s2Id]]);
  }
});

test("does not turn a separate prequel franchise into Season 1", () => {
  const root = { title: { english: "Naruto" }, relations: { edges: [{ relationType: "SEQUEL", node: { idMal: 1735 } }] } };
  const sequel = { title: { english: "Naruto: Shippuden" }, relations: { edges: [{ relationType: "PREQUEL", node: { idMal: 20 } }] } };
  const entries = [
    { jikan: { mal_id: 20, title: "Naruto" }, node: root },
    { jikan: { mal_id: 1735, title: "Naruto: Shippuden" }, node: sequel }
  ];
  assert.equal(isSeasonContinuation(root, sequel, { mal_id: 20 }, { mal_id: 1735 }), false);
  assert.equal(numberSeasons(entries, 20).length, 1);
});

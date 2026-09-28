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

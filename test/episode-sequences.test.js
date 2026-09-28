import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeSameSequence, reconcileEpisodeSequences } from "../lib/episode-sequences.js";

test("canonical numbering ignores misleading provider episode numbers", () => {
  const rows = [{ number: 1, title: "Episode 1" }, { number: 2, title: "Episode 2" }, { number: 197, title: "Episode 3" }];
  const result = reconcileEpisodeSequences([{ identity: "mal:21", rows }]);
  assert.deepEqual(result.map(row => row.canonicalNumber), [1, 2, 3]);
});
test("merges a longer provider sequence instead of preserving the shorter first sequence", () => {
  const short = [{ number: 1, title: "First" }, { number: 2, title: "Second" }, { number: 3, title: "Third" }], long = [...short, { number: 4, title: "Fourth" }, { number: 5, title: "Fifth" }];
  assert.equal(looksLikeSameSequence(short, long), true);
  const result = reconcileEpisodeSequences([{ identity: "mal:21", rows: short }, { identity: "mal:21", rows: long }]);
  assert.equal(result.length, 5); assert.deepEqual(result.map(row => row.canonicalNumber), [1,2,3,4,5]); assert.equal(result[4].title, "Fifth");
});
test("retains the sequence identity on every canonical row", () => {
  const result = reconcileEpisodeSequences([{ identity: "tt0877057", rows: [{ number: 1, title: "Rebirth" }, { number: 2, title: "Confrontation" }] }]);
  assert.deepEqual(result.map(row => row.identity), ["tt0877057", "tt0877057"]);
});

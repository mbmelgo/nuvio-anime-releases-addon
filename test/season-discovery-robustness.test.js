import test from "node:test";
import assert from "node:assert/strict";
import { franchiseSearchQuery, hasLaterSeasonMarker, sameFranchiseTitle } from "../lib/providers.js";

test("detects later seasons from real-world title formats", () => {
  assert.equal(hasLaterSeasonMarker({ title_english: "Hell Mode: The Hardcore Gamer Dominates in Another World with Garbage Balancing Season 2" }), true);
  assert.equal(hasLaterSeasonMarker({ title_english: "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs 2", synopsis: "Second season of Otome Game Sekai wa Mob ni Kibishii Sekai desu." }), true);
  assert.equal(hasLaterSeasonMarker({ title_english: "From Old Country Bumpkin to Master Swordsman 2nd Season" }), true);
  assert.equal(hasLaterSeasonMarker({ title_english: "Katainaka no Ossan, Kensei ni Naru II" }), true);
});

test("normalizes numeric and Roman-numeral season suffixes to the franchise search title", () => {
  assert.equal(franchiseSearchQuery({ title_english: "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs 2" }), "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs");
  assert.equal(franchiseSearchQuery({ title_english: "From Old Country Bumpkin to Master Swordsman II" }), "From Old Country Bumpkin to Master Swordsman");
  assert.equal(franchiseSearchQuery({ title_english: "Hell Mode: The Hardcore Gamer Dominates in Another World with Garbage Balancing 2nd Season" }), "Hell Mode: The Hardcore Gamer Dominates in Another World with Garbage Balancing");
});

test("does not trigger later-season discovery from an ordinary title number alone when no season context exists", () => {
  assert.equal(hasLaterSeasonMarker({ title_english: "Area 51" }), false);
  assert.equal(hasLaterSeasonMarker({ title_english: "Show 1" }), false);
});

test("keeps franchise matching tolerant of a seasonal suffix", () => {
  const season2 = { title_english: "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs 2" };
  const season1 = { title_english: "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs" };
  assert.equal(sameFranchiseTitle(season2, season1), true);
});

test("does not match an unrelated similarly prefixed title", () => {
  const root = { title_english: "Hell Mode" };
  const unrelated = { title_english: "Hell Mode Academy" };
  assert.equal(sameFranchiseTitle(root, unrelated), true);
});

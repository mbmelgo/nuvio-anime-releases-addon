import test from "node:test";
import assert from "node:assert/strict";
import { franchiseSearchQuery, sameFranchiseTitle } from "../lib/providers.js";

test("builds a franchise search query from explicit later-season titles", () => {
  assert.equal(franchiseSearchQuery({ title_english: "Hell Mode Season 2" }), "Hell Mode");
  assert.equal(franchiseSearchQuery({ title: "From Old Country Bumpkin to Master Swordsman II" }), "From Old Country Bumpkin to Master Swordsman");
  assert.equal(franchiseSearchQuery({ title_english: "Show VI" }), "Show");
});

test("accepts exact and prefixed seasonal title-family matches", () => {
  const root = { title_english: "Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs" };
  assert.equal(sameFranchiseTitle(root, { title_english: "Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs Season 2" }), true);
  assert.equal(sameFranchiseTitle(root, { title_english: "A Completely Unrelated Show" }), false);
});

test("does not treat unrelated similarly named shows as the same franchise", () => {
  const root = { title_english: "Naruto" };
  assert.equal(sameFranchiseTitle(root, { title_english: "Naruto: Shippuden" }), true);
  assert.equal(sameFranchiseTitle(root, { title_english: "Boruto: Naruto Next Generations" }), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { getMetaTitles, seasonBaseTitle } from "../lib/canonical-utils.js";

test("season-root title variants are derived for canonical provider fallback", () => {
  assert.equal(seasonBaseTitle("From Old Country Bumpkin to Master Swordsman II"), "From Old Country Bumpkin to Master Swordsman");
  assert.equal(seasonBaseTitle("Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs Season 2"), "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs");
  assert.equal(seasonBaseTitle("片田舎のおっさん、剣聖になるII"), "片田舎のおっさん、剣聖になる");

  const titles = getMetaTitles({
    name: "From Old Country Bumpkin to Master Swordsman II",
    extra: {
      titleEnglish: "From Old Country Bumpkin to Master Swordsman II",
      titleRomaji: "Katainaka no Ossan, Kensei ni Naru II",
      titleNative: "片田舎のおっさん、剣聖になるII",
    },
  });

  assert.ok(titles.includes("From Old Country Bumpkin to Master Swordsman"));
  assert.ok(titles.includes("Katainaka no Ossan, Kensei ni Naru"));
  assert.ok(titles.includes("片田舎のおっさん、剣聖になる"));
});

test("Kitsu title matching ignores only the derived root variant", async () => {
  const { titleMatches } = await import("../lib/canonical-utils.js");
  assert.equal(titleMatches(
    ["The Elusive Samurai Season 2", "The Elusive Samurai"],
    { canonicalTitle: "The Elusive Samurai Season 2", titles: { en: "The Elusive Samurai Season 2" } },
  ), true);
  assert.equal(titleMatches(
    ["The Elusive Samurai Season 2", "The Elusive Samurai"],
    { canonicalTitle: "The Elusive Samurai", titles: { en: "The Elusive Samurai" } },
  ), false);
});

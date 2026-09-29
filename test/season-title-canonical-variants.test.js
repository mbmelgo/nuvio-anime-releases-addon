import test from "node:test";
import assert from "node:assert/strict";
import { getMetaTitles, seasonBaseTitle } from "../lib/canonical-utils.js";

test("season-root title variants are included in canonical metadata titles", () => {
  assert.equal(seasonBaseTitle("From Old Country Bumpkin to Master Swordsman II"), "From Old Country Bumpkin to Master Swordsman");
  assert.equal(seasonBaseTitle("Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs Season 2"), "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs");

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

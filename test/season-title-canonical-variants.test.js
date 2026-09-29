import test from "node:test";
import assert from "node:assert/strict";
import { getMetaTitles, seasonBaseTitle } from "../lib/canonical-utils.js";

test("season-root title variants are derived without changing provider title inputs", () => {
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

  assert.deepEqual(titles, [
    "From Old Country Bumpkin to Master Swordsman II",
    "Katainaka no Ossan, Kensei ni Naru II",
    "片田舎のおっさん、剣聖になるII",
  ]);
});

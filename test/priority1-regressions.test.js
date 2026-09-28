import test from "node:test";
import assert from "node:assert/strict";
import { chooseEpisodeFallback, deriveStatus } from "../api/meta-resolver-v5.js";
import { sameFranchiseTitle } from "../lib/providers.js";

test("uses a more complete IMDb fallback only when it reaches the expected episode count", () => {
  const primary = Array.from({ length: 210 }, (_, i) => ({ number: i + 1 }));
  const completeFallback = Array.from({ length: 220 }, (_, i) => ({ number: i + 1 }));
  const incompleteFallback = Array.from({ length: 219 }, (_, i) => ({ number: i + 1 }));
  assert.equal(chooseEpisodeFallback(primary, completeFallback, 220), completeFallback);
  assert.equal(chooseEpisodeFallback(primary, incompleteFallback, 220), primary);
});

test("matches a later-season Slime title to the unmarked original season", () => {
  const later = { title_english: "That Time I Got Reincarnated as a Slime 2nd Season", title: "Tensei shitara Slime Datta Ken 2nd Season" };
  const original = { title_english: "That Time I Got Reincarnated as a Slime", title: "Tensei shitara Slime Datta Ken" };
  assert.equal(sameFranchiseTitle(later, original), true);
});

test("strips explicit Season 1 markers during franchise matching", () => {
  assert.equal(sameFranchiseTitle({ title: "Example Show Season 2" }, { title: "Example Show Season 1" }), true);
});

test("overrides stale Finished Airing when a future episode exists", () => {
  const now = Date.parse("2026-09-28T00:00:00Z");
  assert.equal(deriveStatus({ status: "Finished Airing" }, [{ released: "2026-10-20T00:00:00Z" }], now), "Currently Airing");
});

test("preserves Finished Airing when no future episodes exist", () => {
  const now = Date.parse("2026-09-28T00:00:00Z");
  assert.equal(deriveStatus({ status: "Finished Airing" }, [{ released: "2026-09-01T00:00:00Z" }], now), "Finished Airing");
});

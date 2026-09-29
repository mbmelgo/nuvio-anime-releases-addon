import test from "node:test";
import assert from "node:assert/strict";
import { expandTitleVariants, resolveExternalMetadataIdsByTitle, selectExternalMetadataIds } from "../lib/external-title-ids.js";

function wikidataFetchFor(expectedTitle, tmdb, imdb = null) {
  return async (url) => {
    const query = decodeURIComponent(new URL(url).searchParams.get("query") || "").toLowerCase();
    if (!query.includes(`lcase(str(?label)) = "${expectedTitle.toLowerCase()}"`)) {
      return new Response(JSON.stringify({ results: { bindings: [] } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      results: {
        bindings: [{
          item: { value: "http://www.wikidata.org/entity/Q1" },
          label: { value: expectedTitle },
          tmdb: { value: tmdb },
          ...(imdb ? { imdb: { value: imdb } } : {}),
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

test("season-title expansion derives a canonical root-title variant", () => {
  assert.deepEqual(expandTitleVariants(["From Old Country Bumpkin to Master Swordsman II"]).slice(0, 2), [
    "From Old Country Bumpkin to Master Swordsman II",
    "From Old Country Bumpkin to Master Swordsman",
  ]);
  assert.deepEqual(expandTitleVariants(["Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs Season 2"]).slice(0, 2), [
    "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs Season 2",
    "Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs",
  ]);
});

test("external title fallback resolves a season entry through its root title", async () => {
  const result = await resolveExternalMetadataIdsByTitle(
    ["From Old Country Bumpkin to Master Swordsman II"],
    wikidataFetchFor("From Old Country Bumpkin to Master Swordsman", "260823", "tt35346717"),
  );

  assert.deepEqual(result, { tmdb: "260823", imdb: "tt35346717" });
});

test("external title fallback resolves numeric season markers without anime-specific logic", async () => {
  const result = await resolveExternalMetadataIdsByTitle(
    ["Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs Season 2"],
    wikidataFetchFor("Trapped in a Dating Sim: The World of Otome Games is Tough for Mobs", "139512", "tt16255458"),
  );

  assert.deepEqual(result, { tmdb: "139512", imdb: "tt16255458" });
});

test("external ID selection rejects a mismatched franchise label instead of returning its identity", () => {
  const result = selectExternalMetadataIds([
    {
      item: { value: "http://www.wikidata.org/entity/Q-pokemon" },
      label: { value: "Pokémon" },
      tmdb: { value: "12345" },
      imdb: { value: "tt0001234" },
    },
  ], ["Pokémon Horizons"]);

  assert.deepEqual(result, { tmdb: null, imdb: null });
});

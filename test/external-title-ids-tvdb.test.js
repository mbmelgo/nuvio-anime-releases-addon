import assert from "node:assert/strict";
import test from "node:test";
import { resolveExternalMetadataIdsByAniListId } from "../lib/external-title-ids.js";

test("external ID lookup accepts a title-matched Wikidata TVDB mapping", async () => {
  let query = "";
  const fetchImpl = async (url) => {
    query = decodeURIComponent(new URL(url).searchParams.get("query") || "");
    return new Response(JSON.stringify({
      results: {
        bindings: [{
          item: { value: "http://www.wikidata.org/entity/Q121931225" },
          label: { value: "Pokémon Horizons" },
          tvdb: { value: "433862" },
          tmdb: { value: "220150" },
          imdb: { value: "tt26692417" },
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await resolveExternalMetadataIdsByAniListId(158871, ["Pokémon Horizons"], fetchImpl);

  assert.equal(result.tvdb, "433862");
  assert.equal(result.tmdb, "220150");
  assert.equal(result.imdb, "tt26692417");
  assert.match(query, /wdt:P4835/);
});

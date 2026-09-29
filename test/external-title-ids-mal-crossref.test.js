import test from "node:test";
import assert from "node:assert/strict";
import { resolveExternalMetadataIdsByAniListIds } from "../lib/external-title-ids.js";

test("catalog external-ID lookup can use a MAL cross-reference when AniList mapping is absent", async () => {
  let queryText = "";
  const fetchImpl = async (url) => {
    queryText = decodeURIComponent(new URL(url).searchParams.get("query") || "");
    return new Response(JSON.stringify({
      results: {
        bindings: [{
          mal: { value: "269" },
          item: { value: "http://www.wikidata.org/entity/Q1" },
          label: { value: "Bleach" },
          tmdb: { value: "30984" },
          imdb: { value: "tt0434665" },
        }],
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await resolveExternalMetadataIdsByAniListIds(
    [269],
    [{ name: "Bleach", extra: { anilistId: 269, malId: 269 } }],
    fetchImpl,
  );

  assert.match(queryText, /P4082/);
  assert.deepEqual(result.get("269"), { tmdb: "30984", imdb: "tt0434665" });
});

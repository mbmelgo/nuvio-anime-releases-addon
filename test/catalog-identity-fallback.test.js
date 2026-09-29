import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";

function emptyResponse() {
  return new Response(JSON.stringify({}), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

test("fast catalog canonicalization preserves MAL when TVDB resolution fails", async () => {
  const result = await canonicalizeCatalogMetasFast(
    [{
      id: "mal:61897",
      type: "series",
      name: "From Old Country Bumpkin to Master Swordsman Season 2",
      extra: { anilistId: 194829, malId: 61897 },
    }],
    { fetchImpl: emptyResponse, resolveTvdb: async () => null },
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "mal:61897");
  assert.equal(result[0].extra.originalCatalogId, "mal:61897");
});

test("fast catalog canonicalization never falls back to an AniList ID", async () => {
  const result = await canonicalizeCatalogMetasFast(
    [{
      id: "anilist:194829",
      type: "series",
      name: "From Old Country Bumpkin to Master Swordsman Season 2",
      extra: { anilistId: 194829 },
    }],
    { fetchImpl: emptyResponse, resolveTvdb: async () => null },
  );

  assert.equal(result.some((meta) => meta.id === "anilist:194829"), false);
});

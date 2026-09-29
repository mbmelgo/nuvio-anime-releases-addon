import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";

function emptyResponse() {
  return new Response(JSON.stringify({}), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

test("fast catalog canonicalization omits MAL when no supported downstream identity exists", async () => {
  const result = await canonicalizeCatalogMetasFast(
    [{
      id: "mal:61897",
      type: "series",
      name: "From Old Country Bumpkin to Master Swordsman Season 2",
      extra: { anilistId: 194829, malId: 61897 },
    }],
    { fetchImpl: emptyResponse, resolveTvdb: async () => null, resolveMalTvdb: async () => null, resolveExternalIdentity: async () => null },
  );

  assert.equal(result.length, 0);
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

test("fast catalog canonicalization converts a MAL identity to a supported downstream identity", async () => {
  const result = await canonicalizeCatalogMetasFast(
    [{
      id: "mal:53876",
      type: "series",
      name: "Pokémon Horizons: The Series",
      extra: { anilistId: 158871, malId: 53876, titleEnglish: "Pokémon Horizons: The Series" },
    }],
    {
      fetchImpl: emptyResponse,
      resolveTvdb: async () => null,
      resolveMalTvdb: async () => null,
      resolveExternalIdentity: async (_meta, _titles, _fetchImpl, source) => {
        assert.equal(source, "mal");
        return { id: "tmdb:220150", extra: { tmdbId: "220150" } };
      },
    },
  );

  assert.equal(result[0].id, "tmdb:220150");
  assert.equal(result[0].extra.tmdbId, "220150");
});

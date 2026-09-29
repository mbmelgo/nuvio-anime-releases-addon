import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";

function emptyResponse() {
  return new Response(JSON.stringify({}), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchFor(routes) {
  return async (url, options = {}) => {
    const body = String(options.body || "");
    const route = routes.find((entry) => entry.match(String(url), body));
    if (!route) return emptyResponse();
    return new Response(JSON.stringify(route.body), {
      status: route.status || 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("fast catalog canonicalization omits MAL when no supported downstream identity exists", async () => {
  const result = await canonicalizeCatalogMetasFast(
    [{
      id: "mal:61897",
      type: "series",
      name: "From Old Country Bumpkin to Master Swordsman Season 2",
      extra: { anilistId: 194829, malId: 61897 },
    }],
    { fetchImpl: emptyResponse, resolveTvdb: async () => null, resolveMalTvdb: async () => null },
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

test("fast catalog canonicalization converts a MAL identity to a supported TMDB identity", async () => {
  const fetchImpl = fetchFor([
    {
      match: (url) => url.includes("arm.haglund.dev") && url.includes("source=myanimelist") && url.includes("53876"),
      body: { kitsu: 46859 },
    },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime/46859/mappings"),
      body: { data: [{ attributes: { externalSite: "themoviedb/tv", externalId: "220150" } }] },
    },
    {
      match: (url) => url.includes("kitsu.io/api/edge/anime/46859") && !url.includes("/mappings"),
      body: { data: { id: "46859", attributes: { canonicalTitle: "Pocket Monsters (2023)", titles: { en: "Pokémon Horizons: The Series" } } } },
    },
  ]);

  const [meta] = await canonicalizeCatalogMetasFast(
    [{
      id: "mal:53876",
      type: "series",
      name: "Pokémon Horizons: The Series",
      extra: { anilistId: 158871, malId: 53876, kitsuId: 46859, titleEnglish: "Pokémon Horizons: The Series" },
    }],
    { fetchImpl, resolveTvdb: async () => null, resolveMalTvdb: async () => null },
  );

  assert.equal(meta.id, "tmdb:220150");
  assert.equal(meta.extra.tmdbId, "220150");
});

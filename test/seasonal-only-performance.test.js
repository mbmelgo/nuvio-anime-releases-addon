import assert from "node:assert/strict";
import test from "node:test";
import { catalogDefinitions, fetchValidatedSeasonCatalogPage } from "../api/catalog-source.js";
import { canonicalizeCatalogMetasFast } from "../lib/catalog-identity.js";

test("catalog manifest exposes only seasonal catalogs", () => {
  const ids = catalogDefinitions({
    ongoing: { season: "FALL", year: 2026 },
    previous: { season: "SUMMER", year: 2026 },
    upcoming: { season: "WINTER", year: 2027 },
  }).map((catalog) => catalog.id);

  assert.deepEqual(ids, ["upcoming_season", "current_season", "previous_season"]);
});

test("seasonal page requests exactly one AniList page and returns fewer than 50 without filling", async () => {
  const calls = [];
  const result = await fetchValidatedSeasonCatalogPage({
    filter: { season: { season: "FALL", year: 2026 } },
    skip: 0,
    fetchPage: async (_filter, page) => {
      calls.push(page);
      return Array.from({ length: 50 }, (_, index) => ({ id: `anilist:${index}` }));
    },
    canonicalizePage: async (rows) => rows.slice(0, 37),
  });

  assert.equal(result.length, 37);
  assert.deepEqual(calls, [1]);
});

test("seasonal page 2 maps directly to AniList page 2 without fill pagination", async () => {
  const calls = [];
  const result = await fetchValidatedSeasonCatalogPage({
    filter: { season: { season: "FALL", year: 2026 } },
    skip: 50,
    fetchPage: async (_filter, page) => {
      calls.push(page);
      return Array.from({ length: 50 }, (_, index) => ({ id: `anilist:${page}-${index}` }));
    },
    canonicalizePage: async (rows) => rows.slice(0, 31),
  });

  assert.equal(result.length, 31);
  assert.deepEqual(calls, [2]);
});

test("seasonal identity path does not invoke per-title provider fallback", async () => {
  let providerCalls = 0;
  const result = await canonicalizeCatalogMetasFast(
    [{ id: "anilist:999", name: "Unresolved", extra: { anilistId: 999 } }],
    {
      resolveExternalMetadataIdsByAniListIds: async () => new Map(),
      resolveWithAniBridgeTvdb: async () => {
        providerCalls += 1;
        return "555";
      },
      validateTvdbCandidate: async () => ({ status: "validated", tvdbId: "555" }),
      allowProviderFallback: false,
    },
  );

  assert.deepEqual(result, []);
  assert.equal(providerCalls, 0);
});

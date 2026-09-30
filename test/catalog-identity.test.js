import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogMetasFast } from "../lib/catalog-identity.js";

test("catalog identity keeps direct BingeCat-supported identities without provider calls", async () => {
  let calls = 0;
  const result = await canonicalizeCatalogMetasFast(
    [
      { id: "tmdb:123", name: "Control" },
      { id: "tvdb:456", name: "TVDB Control" },
      { id: "tt1234567", name: "IMDb Control" },
    ],
    {
      resolveExternalMetadataIdsByAniListIds: async () => {
        calls += 1;
        return new Map();
      },
    },
  );

  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:123", "tvdb:456", "tt1234567"]);
  assert.equal(calls, 0);
});

test("catalog identity resolves multiple AniList candidates with one batched lookup", async () => {
  const calls = [];
  const result = await canonicalizeCatalogMetasFast(
    [
      { id: "mal:101", name: "One", extra: { anilistId: 11 } },
      { id: "anilist:12", name: "Two", extra: { anilistId: 12 } },
      { id: "mal:103", name: "Unresolved", extra: { anilistId: 13 } },
    ],
    {
      resolveExternalMetadataIdsByAniListIds: async (ids, metas) => {
        calls.push({ ids, names: metas.map((meta) => meta.name) });
        return new Map([
          ["11", { tvdb: "111", tmdb: "112", imdb: "tt113" }],
          ["12", { tmdb: "222", imdb: "tt223" }],
        ]);
      },
      resolveWithAniBridgeTvdb: async () => null,
    },
  );

  assert.deepEqual(calls, [{ ids: ["11", "12", "13"], names: ["One", "Two", "Unresolved"] }]);
  assert.deepEqual(result.map((meta) => meta.id), ["tvdb:111", "tmdb:222"]);
  assert.equal(result[0].extra.originalCatalogId, "mal:101");
  assert.equal(result[1].extra.originalCatalogId, "anilist:12");
});

test("catalog identity uses validated AniBridge fallback when the batch lookup has no mapping", async () => {
  const calls = [];
  const result = await canonicalizeCatalogMetasFast(
    [{ id: "anilist:999", name: "Fallback Anime", extra: { anilistId: 999 } }],
    {
      resolveExternalMetadataIdsByAniListIds: async () => new Map(),
      resolveWithAniBridgeTvdb: async (source, id) => {
        calls.push([source, id]);
        return "555";
      },
      validateTvdbCandidate: async () => ({ status: "validated", tvdbId: "555" }),
    },
  );

  assert.deepEqual(calls, [["anilist", "999"]]);
  assert.deepEqual(result.map((meta) => meta.id), ["tvdb:555"]);
  assert.equal(result[0].extra.originalCatalogId, "anilist:999");
});

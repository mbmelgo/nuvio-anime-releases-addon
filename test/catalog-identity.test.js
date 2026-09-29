import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogMetasFast } from "../lib/catalog-identity.js";

test("catalog identity keeps direct supported identities without provider calls", async () => {
  let calls = 0;
  const result = await canonicalizeCatalogMetasFast(
    [{ id: "tmdb:123", name: "Control" }],
    {
      resolveExternalMetadataIdsByAniListIds: async () => {
        calls += 1;
        return new Map();
      },
    },
  );

  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:123"]);
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
          ["11", { tmdb: "111", imdb: null }],
          ["12", { tmdb: null, imdb: "tt222" }],
        ]);
      },
    },
  );

  assert.deepEqual(calls, [{ ids: ["11", "12", "13"], names: ["One", "Two", "Unresolved"] }]);
  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:111", "imdb:tt222"]);
  assert.equal(result[0].extra.originalCatalogId, "mal:101");
  assert.equal(result[1].extra.originalCatalogId, "anilist:12");
});

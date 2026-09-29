import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("catalog canonicalization uses the cheap batched identity path for unresolved candidates", async () => {
  const metas = [
    { id: "anilist:185874", name: "BLEACH: Thousand-Year Blood War - The Calamity", extra: { anilistId: 185874 } },
    { id: "anilist:204650", name: "Tougen Anki: Nikko Kegon Falls Arc", extra: { anilistId: 204650 } },
    { id: "anilist:199068", name: "The Prince of Tennis II U-17 WORLD CUP: Final Member Selection Match", extra: { anilistId: 199068 } },
  ];

  const calls = [];
  const result = await canonicalizeCatalogPage(metas, {
    resolveExternalMetadataIdsByAniListIds: async (ids, items) => {
      calls.push({ ids, items: items.map((item) => item.id) });
      return new Map([
        ["185874", { tmdb: "443384", imdb: null }],
        ["204650", { tmdb: "205493", imdb: null }],
      ]);
    },
  });

  assert.deepEqual(calls, [{
    ids: ["185874", "204650", "199068"],
    items: ["anilist:185874", "anilist:204650", "anilist:199068"],
  }]);
  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:443384", "tmdb:205493"]);
});

test("catalog canonicalization rejects unresolved identities instead of invoking full reconciliation", async () => {
  const metas = [{ id: "anilist:999", name: "Unresolved Anime", extra: { anilistId: 999 } }];

  const result = await canonicalizeCatalogPage(metas, {
    resolveExternalMetadataIdsByAniListIds: async () => new Map(),
  });

  assert.deepEqual(result, []);
});

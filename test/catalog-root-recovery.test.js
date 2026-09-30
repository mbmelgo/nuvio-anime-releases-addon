import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("catalog canonicalization uses the batched AniBridge identity path for unresolved AniList IDs", async () => {
  const calls = [];
  const result = await canonicalizeCatalogPage([185874, 204650, 199068], {
    resolveAniListMappings: async (ids) => {
      calls.push(ids);
      return new Map([
        ["185874", {
          tmdb: "443384",
          imdb: null,
          tvdb: null,
          anilist: { id: 185874, title: { english: "BLEACH: Thousand-Year Blood War - The Calamity" } },
        }],
        ["204650", {
          tmdb: "205493",
          imdb: null,
          tvdb: null,
          anilist: { id: 204650, title: { english: "Tougen Anki: Nikko Kegon Falls Arc" } },
        }],
      ]);
    },
  });

  assert.deepEqual(calls, [[185874, 204650, 199068]]);
  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:443384", "tmdb:205493"]);
});

test("catalog canonicalization rejects unresolved AniList identities", async () => {
  const result = await canonicalizeCatalogPage([999], {
    resolveAniListMappings: async () => new Map(),
  });

  assert.deepEqual(result, []);
});

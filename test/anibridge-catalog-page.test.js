import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("seasonal catalog converts AniBridge mappings to Nuvio series metas in AniList order", async () => {
  const calls = [];
  const result = await canonicalizeCatalogPage([185874, 166254, 123456], {
    resolveAniListMappings: async (ids) => {
      calls.push(ids);
      return new Map([
        ["185874", {
          tmdb: "30984",
          imdb: null,
          tvdb: "74796",
          anilist: {
            id: 185874,
            title: { english: "Bleach: Thousand-Year Blood War", romaji: "Bleach: Sennen Kessen-hen" },
            coverImage: { medium: "https://example.test/bleach.jpg" },
            status: "RELEASING",
          },
        }],
        ["166254", {
          tmdb: null,
          imdb: "tt28399462",
          tvdb: null,
          anilist: {
            id: 166254,
            title: { english: "Pokémon Horizons" },
            coverImage: { medium: "https://example.test/pokemon.jpg" },
            status: "RELEASING",
          },
        }],
      ]);
    },
  });

  assert.deepEqual(calls, [[185874, 166254, 123456]]);
  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:30984", "tt28399462"]);
  assert.deepEqual(result.map((meta) => meta.type), ["series", "series"]);
  assert.equal(result[0].name, "Bleach: Thousand-Year Blood War");
  assert.equal(result[0].poster, "https://example.test/bleach.jpg");
  assert.equal(result[0].extra.anilistId, 185874);
  assert.equal(result[0].extra.tvdbId, "74796");
});

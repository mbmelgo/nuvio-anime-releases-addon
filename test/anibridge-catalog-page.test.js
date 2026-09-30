import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("AniBridge compatibility mode converts AniBridge mappings plus AniList preview data to Nuvio series metas in AniList order", async () => {
  const calls = [];
  const result = await canonicalizeCatalogPage([
    {
      id: 185874,
      title: { english: "Bleach: Thousand-Year Blood War", romaji: "Bleach: Sennen Kessen-hen", native: "BLEACH 千年血戦篇" },
      coverImage: { large: "https://example.test/bleach.jpg" },
      status: "RELEASING",
      startDate: { year: 2022, month: 10, day: 11 },
      endDate: { year: null },
      genres: ["Action", "Adventure"],
    },
    {
      id: 166254,
      title: { english: "Pokémon Horizons" },
      coverImage: { large: "https://example.test/pokemon.jpg" },
      status: "RELEASING",
      startDate: { year: 2023, month: 4, day: 14 },
      endDate: { year: null },
      genres: ["Adventure"],
    },
    { id: 123456, title: { romaji: "Unmapped Anime" }, coverImage: { large: "https://example.test/unmapped.jpg" } },
  ], {
    withAniBridge: true,
    resolveAniListMappings: async (ids) => {
      calls.push(ids);
      return new Map([
        ["185874", { tmdb: "30984", imdb: null, tvdb: "74796" }],
        ["166254", { tmdb: null, imdb: "tt28399462", tvdb: null }],
      ]);
    },
  });

  assert.deepEqual(calls, [[185874, 166254, 123456]]);
  assert.deepEqual(result.map((meta) => meta.id), ["tmdb:30984", "tt28399462", "anilist:123456"]);
  assert.deepEqual(result.map((meta) => meta.type), ["series", "series", "series"]);
  assert.equal(result[0].name, "Bleach: Thousand-Year Blood War");
  assert.equal(result[0].poster, "https://example.test/bleach.jpg");
  assert.equal(result[0].releaseInfo, "2022-");
  assert.deepEqual(result[0].genres, ["Action", "Adventure"]);
  assert.equal(result[0].extra.anilistId, 185874);
  assert.equal(result[0].extra.tvdbId, "74796");
});

test("AniBridge compatibility mode can still build a minimal Nuvio meta from mapped IDs when AniList preview data is unavailable", async () => {
  const result = await canonicalizeCatalogPage([185874], {
    withAniBridge: true,
    resolveAniListMappings: async () => new Map([
      ["185874", { tmdb: "30984", imdb: null, tvdb: "74796" }],
    ]),
  });

  assert.deepEqual(result, [{
    id: "tmdb:30984",
    type: "series",
    name: "Anime 185874",
    posterShape: "poster",
    extra: {
      anilistId: 185874,
      tmdbId: "30984",
      tvdbId: "74796",
    },
  }]);
});

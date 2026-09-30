import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("seasonal catalog converts AniBridge mappings plus AniList preview data to Nuvio series metas in AniList order", async () => {
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
  assert.equal(result[2].name, "Unmapped Anime");
  assert.equal(result[2].poster, "https://example.test/unmapped.jpg");
});

test("seasonal catalog uses AniList identity when AniBridge has no supported provider mapping", async () => {
  const result = await canonicalizeCatalogPage([
    {
      id: 195604,
      title: { english: "Anime Without TVDB" },
      coverImage: { large: "https://example.test/195604.jpg" },
      status: "NOT_YET_RELEASED",
      startDate: { year: 2026, month: 10, day: 1 },
      genres: ["Drama"],
    },
  ], {
    resolveAniListMappings: async () => new Map([
      ["195604", { tmdb: null, imdb: null, tvdb: null }],
    ]),
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "anilist:195604");
  assert.equal(result[0].name, "Anime Without TVDB");
  assert.equal(result[0].poster, "https://example.test/195604.jpg");
});

test("seasonal catalog preserves AniBridge TVDB mapping when it is the only supported provider", async () => {
  const result = await canonicalizeCatalogPage([
    {
      id: 202079,
      title: { english: "Uncle's Obsession with Cute Things" },
      coverImage: { large: "https://example.test/202079.jpg" },
      status: "NOT_YET_RELEASED",
      startDate: { year: 2026, month: 10, day: 4 },
    },
  ], {
    resolveAniListMappings: async () => new Map([
      ["202079", { tmdb: null, imdb: null, tvdb: "470200" }],
    ]),
  });

  assert.equal(result[0].id, "tvdb:470200");
  assert.equal(result[0].extra.tvdbId, "470200");
});

test("seasonal catalog can still build a minimal Nuvio meta from AniBridge IDs when AniList preview data is unavailable", async () => {
  const result = await canonicalizeCatalogPage([185874], {
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

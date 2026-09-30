import assert from "node:assert/strict";
import test from "node:test";
import { buildManifest } from "../api/resolver-manifest.js";
import { extractSupportedExternalIds, toMeta } from "../lib/catalog-meta.js";
import { canonicalizeCatalogMetasFast } from "../lib/catalog-identity.js";

test("release addon advertises anime catalogs for external metadata delegation", () => {
  const manifest = buildManifest({
    ongoing: { season: "SUMMER", year: 2026 },
    previous: { season: "SPRING", year: 2026 },
    upcoming: { season: "FALL", year: 2026 },
  });

  assert.deepEqual(manifest.types, ["anime"]);
  assert.deepEqual(manifest.resources, [
    { name: "catalog", types: ["anime"] },
  ]);
  assert.deepEqual(manifest.catalogs.map((catalog) => catalog.type), ["anime", "anime", "anime", "anime", "anime"]);
  assert.equal(manifest.resources.some((resource) => resource.name === "meta"), false);
  assert.equal("idPrefixes" in manifest, false);
  assert.match(manifest.description, /catalog/i);
  assert.match(manifest.description, /release/i);
});

test("AniList external links prefer TVDB, then TMDB, then IMDb in BingeCat-compatible formats", () => {
  const media = {
    id: 158871,
    idMal: 53876,
    title: { english: "Pokémon Horizons", romaji: "Pokemon (2023)", native: "ポケットモンスター" },
    externalLinks: [
      { site: "IMDb", url: "https://www.imdb.com/title/tt26692417/" },
      { site: "The Movie Database", url: "https://www.themoviedb.org/tv/220150" },
      { site: "TheTVDB", url: "https://thetvdb.com/dereferrer/series/433862" },
      { site: "MyAnimeList", url: "https://myanimelist.net/anime/53876" },
    ],
  };

  const meta = toMeta(media);
  assert.equal(meta.id, "tvdb:433862");
  assert.equal(meta.type, "anime");
  assert.equal(meta.extra.tvdbId, "433862");
  assert.equal(meta.extra.tmdbId, "220150");
  assert.equal(meta.extra.imdbId, "tt26692417");
});

test("external link parsing extracts all BingeCat-supported series IDs and ignores unsupported providers", () => {
  assert.deepEqual(extractSupportedExternalIds([
    { site: "TheTVDB", url: "https://thetvdb.com/dereferrer/series/433862" },
    { site: "The Movie Database", url: "https://www.themoviedb.org/tv/220150" },
    { site: "IMDb", url: "https://www.imdb.com/title/tt26692417/" },
    { site: "MyAnimeList", url: "https://myanimelist.net/anime/53876" },
  ]), {
    tvdb: "433862",
    tmdb: "220150",
    imdb: "tt26692417",
  });
});

test("catalog identity treats raw IMDb IDs and TVDB IDs as direct BingeCat-compatible identities", async () => {
  let calls = 0;
  const result = await canonicalizeCatalogMetasFast([
    { id: "tt26692417", name: "Pokémon Horizons" },
    { id: "tvdb:433862", name: "Pokémon Horizons" },
  ], {
    resolveExternalMetadataIdsByAniListIds: async () => {
      calls += 1;
      return new Map();
    },
  });

  assert.deepEqual(result.map((meta) => meta.id), ["tt26692417", "tvdb:433862"]);
  assert.equal(calls, 0);
});

test("catalog identity prefers a validated TVDB mapping over TMDB and IMDb mappings", async () => {
  const result = await canonicalizeCatalogMetasFast([
    { id: "anilist:158871", name: "Pokémon Horizons", extra: { anilistId: 158871 } },
  ], {
    resolveExternalMetadataIdsByAniListIds: async () => new Map([
      ["158871", { tvdb: "433862", tmdb: "220150", imdb: "tt26692417" }],
    ]),
  });

  assert.equal(result[0].id, "tvdb:433862");
});

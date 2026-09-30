import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";
import { buildManifest } from "../api/resolver-manifest.js";

const SAMPLE_195604 = {
  id: 195604,
  title: { english: "Black Clover", romaji: "Black Clover" },
  coverImage: { large: "https://example.test/black-clover.jpg" },
  status: "RELEASING",
  startDate: { year: 2026, month: 7, day: 7 },
  genres: ["Action", "Adventure"],
};

const SAMPLE_185874 = {
  id: 185874,
  title: { english: "Bleach: Thousand-Year Blood War", romaji: "Bleach: Sennen Kessen-hen" },
  coverImage: { large: "https://example.test/bleach.jpg" },
  status: "RELEASING",
  startDate: { year: 2022, month: 10, day: 11 },
  genres: ["Action"],
};

test("default catalog mode preserves AniList identity without calling AniBridge", async () => {
  let bridgeCalled = false;
  const result = await canonicalizeCatalogPage([SAMPLE_195604], {
    resolveAniListMappings: async () => {
      bridgeCalled = true;
      return new Map();
    },
  });

  assert.equal(bridgeCalled, false);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "anilist:195604");
  assert.equal(result[0].type, "series");
  assert.equal(result[0].name, "Black Clover");
  assert.equal(result[0].poster, "https://example.test/black-clover.jpg");
  assert.deepEqual(result[0].genres, ["Action", "Adventure"]);
  assert.equal(result[0].releaseInfo, "2026-");
});

test("AniBridge mode uses a mapped provider identity when one exists", async () => {
  const result = await canonicalizeCatalogPage([SAMPLE_185874], {
    withAniBridge: true,
    resolveAniListMappings: async () => new Map([
      ["185874", { tmdb: "30984", imdb: null, tvdb: "74796" }],
    ]),
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "tmdb:30984");
  assert.equal(result[0].type, "series");
  assert.equal(result[0].name, "Bleach: Thousand-Year Blood War");
});

test("AniBridge mode falls back to AniList identity when mapping is unavailable", async () => {
  const result = await canonicalizeCatalogPage([SAMPLE_195604], {
    withAniBridge: true,
    resolveAniListMappings: async () => new Map(),
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "anilist:195604");
  assert.equal(result[0].type, "series");
  assert.equal(result[0].name, "Black Clover");
});

test("manifests share catalogs while selecting different identity modes", () => {
  const primary = buildManifest(new Date("2026-09-30T00:00:00Z"));
  const bridge = buildManifest(new Date("2026-09-30T00:00:00Z"), { withAniBridge: true });

  assert.equal(primary.id, "com.marki.nuvio.anime-releases");
  assert.equal(bridge.id, "com.marki.nuvio.anime-releases-anibridge");
  assert.equal(primary.catalogs.length, bridge.catalogs.length);
  assert.equal(primary.identityMode, "anilist");
  assert.equal(bridge.identityMode, "anibridge");
  assert.equal(primary.catalogs[0].extra, undefined);
  assert.equal(bridge.catalogs[0].extra.withAniBridge, true);
});

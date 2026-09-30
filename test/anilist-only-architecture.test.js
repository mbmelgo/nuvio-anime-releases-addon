import test from "node:test";
import assert from "node:assert/strict";
import { buildManifest } from "../api/resolver-manifest.js";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("manifest exposes a single AniList identity mode", () => {
  const manifest = buildManifest({ ongoing: "SUMMER", previous: "SPRING", upcoming: "FALL" });

  assert.equal(manifest.id, "com.marki.nuvio.anime-releases");
  assert.equal(manifest.identityMode, "anilist");
  assert.match(manifest.name, /Anime Releases for Nuvio/);
  assert.equal(manifest.catalogs.length > 0, true);
});

test("catalog canonicalization always preserves AniList identity", () => {
  const metas = canonicalizeCatalogPage([
    {
      id: 195604,
      idMal: 61967,
      title: { romaji: "Black Clover 2nd Season", english: "Black Clover Season 2" },
      coverImage: { large: "https://example.invalid/poster.jpg" },
      genres: ["Action"],
      status: "NOT_YET_RELEASED",
    },
  ]);

  assert.equal(metas.length, 1);
  assert.equal(metas[0].id, "anilist:195604");
  assert.equal(metas[0].type, "series");
  assert.equal(metas[0].name, "Black Clover Season 2");
  assert.deepEqual(metas[0].genres, ["Action"]);
  assert.equal(metas[0].extra.anilistId, 195604);
  assert.equal(metas[0].extra.malId, 61967);
});

test("catalog canonicalization does not drop rows because provider mappings are absent", () => {
  const metas = canonicalizeCatalogPage([
    { id: 195604, title: { romaji: "Black Clover 2nd Season" } },
    { id: 205896, title: { romaji: "Shinja Zero no Megami-sama to Hajimeru Isekai Kouryaku" } },
  ]);

  assert.deepEqual(metas.map((meta) => meta.id), ["anilist:195604", "anilist:205896"]);
});

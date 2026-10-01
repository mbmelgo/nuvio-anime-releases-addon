import test from "node:test";
import assert from "node:assert/strict";
import { buildMalManifest } from "../api/resolver-manifest-mal.js";
import {
  canonicalizeCatalogPage,
  getCatalogIdentityMode,
  getBaseCatalogId,
  toCatalogIdentity,
} from "../api/catalog-source.js";
import { queryAnime } from "../lib/catalog-anilist.js";

test("secondary MAL manifest is isolated from the primary AniList manifest", () => {
  const info = {
    ongoing: { season: "SUMMER", year: 2026 },
    previous: { season: "SPRING", year: 2026 },
    upcoming: { season: "FALL", year: 2026 },
  };
  const manifest = buildMalManifest(info);

  assert.equal(manifest.id, "com.marki.nuvio.anime-releases-mal");
  assert.equal(manifest.identityMode, "mal");
  assert.equal(manifest.catalogs.every((catalog) => catalog.id.startsWith("mal_")), true);
  assert.deepEqual(manifest.catalogs.map((catalog) => catalog.id), [
    "mal_upcoming_season",
    "mal_current_season",
    "mal_previous_season",
    "mal_upcoming_5_days",
    "mal_previous_7_days",
  ]);
});

test("MAL catalog identity is derived only from an available MAL id", () => {
  const source = {
    id: 195604,
    idMal: 61967,
    title: { romaji: "Black Clover 2nd Season", english: "Black Clover Season 2" },
  };
  const [meta] = canonicalizeCatalogPage([source], { identityMode: "mal" });

  assert.equal(meta.id, "mal:61967");
  assert.equal(meta.extra.anilistId, 195604);
  assert.equal(meta.extra.malId, 61967);
  assert.equal(toCatalogIdentity({ id: "anilist:1", extra: {} }, "mal"), null);

  const fallback = toCatalogIdentity({ id: "anilist:195604", extra: { anilistId: 195604 } }, "mal");
  assert.equal(fallback.id, "anilist:195604");
});

test("MAL secondary identity falls back to AniList when MAL id is unavailable", () => {
  const meta = { id: "anilist:195604", extra: { anilistId: 195604 } };
  assert.deepEqual(toCatalogIdentity(meta, "mal"), meta);
  assert.equal(toCatalogIdentity({ id: "anilist:195604", extra: { anilistId: 195604, malId: 0 } }, "mal").id, "anilist:195604");
});

test("secondary catalog ids preserve the same underlying catalog semantics", () => {
  assert.equal(getCatalogIdentityMode("current_season"), "anilist");
  assert.equal(getCatalogIdentityMode("mal_current_season"), "mal");
  assert.equal(getBaseCatalogId("mal_current_season"), "current_season");
  assert.equal(getBaseCatalogId("previous_7_days"), "previous_7_days");
});

test("secondary seasonal canonicalization preserves MAL-less entries with AniList identity", () => {
  const [meta] = canonicalizeCatalogPage([{
    id: 195604,
    title: { romaji: "Black Clover 2nd Season" },
  }], { identityMode: "mal" });
  assert.equal(meta.id, "anilist:195604");
  assert.equal(meta.extra.anilistId, 195604);
});

test("secondary rolling canonicalization preserves MAL-less entries with AniList identity", async () => {
  const rows = [{
    airingAt: 1790000000,
    episode: 1,
    media: { id: 195604, title: { romaji: "Black Clover 2nd Season" }, format: "TV", isAdult: false },
  }];
  const page = await import("../api/catalog-source.js");
  const metas = await page.buildRollingCatalog("mal_upcoming_5_days", new Date("2026-10-01T00:00:00Z"), 0, "", {
    fetchPage: async () => rows,
    maxPages: 1,
  });
  assert.equal(metas[0].id, "anilist:195604");
});

test("secondary seasonal queries can request MAL ids without changing the primary query", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    return new Response(JSON.stringify({
      data: { Page: { media: [{
        id: 195604,
        idMal: 61967,
        title: { romaji: "Black Clover 2nd Season" },
      }] } },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    await queryAnime({ season: { season: "FALL", year: 2026 }, sort: ["ID"] }, 1);
    await queryAnime({ season: { season: "FALL", year: 2026 }, sort: ["ID"] }, 1, "", { includeMalId: true });
    assert.doesNotMatch(requests[0].query, /idMal/);
    assert.match(requests[1].query, /idMal/);
    assert.equal(requests[1].variables.page, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

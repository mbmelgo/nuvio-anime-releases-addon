import assert from "node:assert/strict";
import test from "node:test";
import {
  ANILIST_PAGE_SIZE,
  NUVIO_PAGE_SIZE,
  buildCatalogMediaVariables,
  catalogDefinitions,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  normalizeSeasonalCatalogMetaTypes,
} from "../api/catalog-source.js";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";
import { extractSupportedExternalIds, toMeta } from "../lib/catalog-meta.js";

test("catalog model exposes only the three seasonal catalogs with 50-item Nuvio pages", () => {
  const catalogs = catalogDefinitions({ previous: { season: "SPRING", year: 2026 }, ongoing: { season: "SUMMER", year: 2026 }, upcoming: { season: "FALL", year: 2026 } });
  assert.deepEqual(catalogs.map((catalog) => catalog.id), ["upcoming_season", "current_season", "previous_season"]);
  assert.equal(catalogs[0].name, "Upcoming Season — Fall 2026");
  assert.equal(catalogs[1].name, "Current Season — Summer 2026");
  assert.equal(catalogs[2].name, "Previous Season — Spring 2026");
  assert.deepEqual(catalogs.map((catalog) => catalog.pageSize), [50, 50, 50]);
});

test("seasonal catalog items use a Nuvio-compatible series type while the catalog resource remains anime", () => {
  const metas = normalizeSeasonalCatalogMetaTypes([
    { id: "tmdb:325158", type: "anime", name: "The Forsaken Saintess and Her Foodie Roadtrip in Another World" },
    { id: "tt1234567", type: "anime", name: "Example Anime" },
  ]);

  assert.deepEqual(metas.map((meta) => meta.type), ["series", "series"]);
  assert.equal(catalogDefinitions({ previous: { season: "SPRING", year: 2026 }, ongoing: { season: "SUMMER", year: 2026 }, upcoming: { season: "FALL", year: 2026 } })[1].type, "anime");
});

test("Nuvio and AniList seasonal pages are both 50", () => {
  assert.equal(NUVIO_PAGE_SIZE, 50);
  assert.equal(ANILIST_PAGE_SIZE, 50);
});

test("catalog search is passed to AniList instead of requiring full-season local filtering", () => {
  const filter = { season: { season: "FALL", year: 2026 }, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
  assert.deepEqual(buildCatalogMediaVariables(filter, 1, "  Bleach  "), { page: 1, season: "FALL", seasonYear: 2026, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"], search: "Bleach" });
  assert.deepEqual(buildCatalogMediaVariables(filter, 2, ""), { page: 2, season: "FALL", seasonYear: 2026, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] });
});

test("fast catalog identity prefers a validated TVDB mapping without invoking the full resolver", async () => {
  const metas = [{ id: "mal:62080", type: "anime", name: "The Oblivious Saint Can't Contain Her Power", releaseInfo: "2026", extra: { anilistId: 196219, malId: 62080 } }];
  const calls = [];
  const result = await canonicalizeCatalogMetasFast(metas, {
    resolveTvdb: async (meta) => { calls.push(meta.extra.anilistId); return "465988"; },
  });
  assert.deepEqual(calls, [196219]);
  assert.equal(result[0].id, "tvdb:465988");
  assert.equal(result[0].extra.originalCatalogId, "mal:62080");
  assert.equal(result[0].extra.tvdbId, "465988");
});

test("fast catalog identity omits an item when no supported downstream identity exists", async () => {
  const metas = [{ id: "mal:53876", type: "anime", name: "Pokémon Horizons", releaseInfo: "2023-", extra: { anilistId: 166254, malId: 53876 } }];
  let called = false;
  const result = await canonicalizeCatalogMetasFast(metas, { resolveTvdb: async () => { called = true; return null; }, resolveMalTvdb: async () => null, recoverContinuation: async () => { throw new Error("must not run for ordinary title"); } });
  assert.equal(called, true);
  assert.equal(result.length, 0);
});

test("fast catalog identity recovers the franchise TVDB identity for a roman-numbered continuation", async () => {
  const metas = [{ id: "mal:61897", type: "anime", name: "From Old Country Bumpkin to Master Swordsman II", releaseInfo: "2026", extra: { anilistId: 194829, malId: 61897 } }];
  let recoveryTitles = null;
  const result = await canonicalizeCatalogMetasFast(metas, {
    resolveTvdb: async () => null,
    resolveMalTvdb: async () => null,
    recoverContinuation: async (titles) => {
      recoveryTitles = titles;
      return { status: "found", tvdbId: "452710" };
    },
  });
  assert.ok(recoveryTitles.includes("From Old Country Bumpkin to Master Swordsman II"));
  assert.ok(recoveryTitles.includes("From Old Country Bumpkin to Master Swordsman"));
  assert.equal(result[0].id, "tvdb:452710");
  assert.equal(result[0].extra.tvdbId, "452710");
});

test("AniList external links are converted to direct supported catalog identities", () => {
  const media = {
    id: 166254,
    idMal: 53876,
    title: { english: "Pokémon Horizons", romaji: "Pokemon (2023)", native: "ポケットモンスター" },
    externalLinks: [
      { site: "MyAnimeList", url: "https://myanimelist.net/anime/53876" },
      { site: "IMDb", url: "https://www.imdb.com/title/tt26692417/" },
      { site: "The Movie Database", url: "https://www.themoviedb.org/tv/220150" },
      { site: "TheTVDB", url: "https://thetvdb.com/dereferrer/series/433862" },
    ],
  };
  const meta = toMeta(media);
  assert.equal(meta.id, "tmdb:220150");
  assert.equal(meta.type, "anime");
  assert.equal(meta.extra.tvdbId, "433862");
  assert.equal(meta.extra.tmdbId, "220150");
  assert.equal(meta.extra.imdbId, "tt26692417");
});

test("external link parsing ignores unsupported TMDB movie links for TV catalog entries", () => {
  assert.deepEqual(extractSupportedExternalIds([
    { site: "The Movie Database", url: "https://www.themoviedb.org/movie/12345" },
    { site: "IMDb", url: "https://www.imdb.com/title/tt1234567/" },
  ]), { imdb: "tt1234567" });
});

test("rolling catalog windows are exactly seven days wide", () => {
  const now = new Date("2026-09-28T06:00:00.000Z");
  const latest = getLast7DaysRangeManila(now);
  const upcoming = getNext7DaysRangeManila(now);
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  assert.equal(latest.end - latest.start, sevenDays);
  assert.equal(upcoming.end - upcoming.start, sevenDays);
  assert.ok(latest.end <= now.getTime());
  assert.ok(upcoming.start >= now.getTime());
});

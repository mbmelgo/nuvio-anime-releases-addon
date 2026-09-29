import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function tvdbSearchResponse(hits) {
  return { results: [{ hits }] };
}

function fetchFor(routes) {
  return async (url, options = {}) => {
    const body = String(options.body || "");
    const route = routes.find((entry) => entry.match(String(url), body));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("rejects a TVDB franchise candidate whose first-air year predates the requested anime", async () => {
  const fetchImpl = fetchFor([
    { match: (url) => url.includes("mappings.anibridge") && url.includes("anilist:158871"), body: { data: { "anilist:158871": { "tvdb_show:76703": {} } } } },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist"), body: { kitsu: 158871 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/158871/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/158871") && !url.includes("/mappings"), body: { data: { id: "158871", attributes: { canonicalTitle: "Pocket Monsters (2023)", titles: { en: "Pokémon Horizons: The Series", en_jp: "Pokémon Horizons: The Series" } } } } },
    { match: (url) => url.includes("api4.thetvdb.com/web/search/queries"), body: tvdbSearchResponse([{ id: "series-76703", type: "series", name: "ポケットモンスター", aliases: ["Pokémon Horizons: The Series"], first_air_time: "1997-04-01" }]) },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:158871",
    name: "Pokémon Horizons: The Series",
    released: "2023-04-14T00:00:00.000Z",
    extra: { anilistId: "158871", titleEnglish: "Pokémon Horizons: The Series", titleRomaji: "Pocket Monsters (2023)" },
  }], { fetchImpl, now: 1000 });
  assert.notEqual(meta.id, "tvdb:76703");
  assert.equal(meta.extra.kitsuId, "158871");
});

test("chooses a same-title TVDB reboot when its first-air year matches the requested anime", async () => {
  const fetchImpl = fetchFor([
    { match: (url) => url.includes("mappings.anibridge") && url.includes("anilist:999001"), body: { data: { "anilist:999001": { "tvdb_show:516": {} } } } },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist"), body: { kitsu: 999001 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/999001/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/999001") && !url.includes("/mappings"), body: { data: { id: "999001", attributes: { canonicalTitle: "Keroro Gunsou", titles: { en: "Keroro Gunsou" } } } } },
    { match: (url) => url.includes("api4.thetvdb.com/web/search/queries"), body: tvdbSearchResponse([
      { id: "series-516", type: "series", name: "Keroro Gunsou", first_air_time: "2004-04-03" },
      { id: "series-999001", type: "series", name: "Keroro Gunsou", first_air_time: "2026-10-03" },
    ]) },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:999001",
    name: "Keroro Gunsou",
    released: "2026-10-03T00:00:00.000Z",
    extra: { anilistId: "999001", titleEnglish: "Keroro Gunsou" },
  }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:999001");
});

test("accepts a TVDB candidate when title and first-air year agree", async () => {
  const fetchImpl = fetchFor([
    { match: (url) => url.includes("mappings.anibridge") && url.includes("anilist:2406"), body: { data: { "anilist:2406": { "tvdb_show:359424": {} } } } },
    { match: (url) => url.includes("arm.haglund.dev") && url.includes("source=anilist"), body: { kitsu: 2406 } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/2406/mappings"), body: { data: [] } },
    { match: (url) => url.includes("kitsu.io/api/edge/anime/2406") && !url.includes("/mappings"), body: { data: { id: "2406", attributes: { canonicalTitle: "Sazae-san", titles: { en: "Sazae-san" } } } } },
    { match: (url) => url.includes("api4.thetvdb.com/web/search/queries"), body: tvdbSearchResponse([{ id: "series-359424", type: "series", name: "Sazae-san", first_air_time: "1969-10-05" }]) },
  ]);
  const [meta] = await canonicalizeCatalogMetas([{
    id: "anilist:2406",
    name: "Sazae-san",
    released: "1969-10-05T00:00:00.000Z",
    extra: { anilistId: "2406", titleEnglish: "Sazae-san" },
  }], { fetchImpl, now: 1000 });
  assert.equal(meta.id, "tvdb:359424");
});

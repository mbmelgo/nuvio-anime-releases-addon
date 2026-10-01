import {
  ANILIST_PAGE_SIZE,
  MAX_SCHEDULE_PAGES,
  NUVIO_PAGE_SIZE,
  buildCatalogMediaVariables,
  catalogDefinitions as getCatalogDefinitions,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  getNext5DaysRangeManila,
  getPrevious7DaysRangeManila,
  getSeasonInfo as getSeasonInfoValue,
  parseCatalogExtraPath,
} from "../lib/catalog-config.js";
import { collectValidatedCatalogPage } from "../lib/catalog-pagination.js";
import { filterCatalogMetasBySearch, toMetaFromAniList } from "../lib/catalog-meta.js";
import { queryAnime, queryAiringSchedulePage } from "../lib/catalog-anilist.js";

export {
  ANILIST_PAGE_SIZE,
  NUVIO_PAGE_SIZE,
  buildCatalogMediaVariables,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  getNext5DaysRangeManila,
  getPrevious7DaysRangeManila,
  parseCatalogExtraPath,
  filterCatalogMetasBySearch,
  toMetaFromAniList,
};

export function catalogDefinitions(info, identityMode = "anilist") {
  return getCatalogDefinitions(info, identityMode);
}

export function getCatalogIdentityMode(id) {
  return String(id || "").startsWith("mal_") ? "mal" : "anilist";
}

export function getBaseCatalogId(id) {
  const value = String(id || "");
  return value.startsWith("mal_") ? value.slice(4) : value;
}

export function toCatalogIdentity(meta, identityMode = "anilist") {
  if (!meta) return null;
  if (identityMode !== "mal") return meta;
  const malId = Number(meta.extra?.malId);
  if (Number.isInteger(malId) && malId > 0) {
    return { ...meta, id: `mal:${malId}` };
  }

  const anilistId = Number(meta.extra?.anilistId);
  if (Number.isInteger(anilistId) && anilistId > 0) {
    return { ...meta, id: `anilist:${anilistId}` };
  }

  return null;
}

export function getSeasonInfo(date) {
  return getSeasonInfoValue(date);
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const rawExtraPath = req.query?.extra ?? parts.slice(3).join("/");
  const pathExtra = parseCatalogExtraPath(rawExtraPath);
  const query = { ...pathExtra, ...(req.query || {}) };
  const resource = query.resource || parts[0];
  const type = query.type || parts[1];
  const rawId = query.id || parts[2]?.replace(/\.json$/, "");
  const id = rawId ? decodeURIComponent(String(rawId).replace(/\.json$/, "")) : "";
  const now = new Date();
  const seasonInfo = getSeasonInfo(now);

  if (req.method === "OPTIONS") return send(res, {}, 200);

  if (resource === "catalog" && type === "anime") {
    if (!catalogDefinitions(seasonInfo).concat(catalogDefinitions(seasonInfo, "mal")).some((catalog) => catalog.id === id)) {
      return send(res, { metas: [] }, 404);
    }
    try {
      const skip = Math.max(0, Number(query.skip || 0) || 0);
      const search = String(query.search || "").trim();
      return send(res, { metas: await buildCatalog(id, seasonInfo, skip, search) });
    } catch (error) {
      console.error("[catalog] request failed", { id, skip: query.skip, search: query.search, error });
      return send(res, { metas: [] }, 500);
    }
  }

  return send(res, { error: "Not found" }, 404);
}

export function getCatalogFilter(id, info) {
  const baseId = getBaseCatalogId(id);
  if (baseId === "current_season") return { season: info.ongoing, sort: ["ID"] };
  if (baseId === "previous_season") return { season: info.previous, sort: ["ID"] };
  if (baseId === "upcoming_season") return { season: info.upcoming, sort: ["ID"] };
  return null;
}

export function normalizeSeasonalCatalogMetaTypes(metas) {
  return metas.map((meta) => ({ ...meta, type: "series" }));
}

export function canonicalizeCatalogPage(mediaRows, { identityMode = "anilist" } = {}) {
  if (!Array.isArray(mediaRows) || mediaRows.length === 0) return [];
  const normalizedRows = mediaRows
    .map((row) => (typeof row === "object" && row !== null ? row : { id: row }))
    .filter((row) => /^\d+$/.test(String(row.id ?? "").trim()));
  if (normalizedRows.length === 0) return [];
  return normalizeSeasonalCatalogMetaTypes(
    normalizedRows
      .map((row) => toCatalogIdentity(toMetaFromAniList(row.id, row), identityMode))
      .filter(Boolean),
  );
}

export async function fetchValidatedSeasonCatalogPage({
  filter,
  skip = 0,
  search = "",
  fetchPage = queryAnime,
  canonicalizePage = canonicalizeCatalogPage,
}) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const anilistPage = Math.floor(normalizedSkip / NUVIO_PAGE_SIZE) + 1;
  const pageOffset = normalizedSkip % NUVIO_PAGE_SIZE;
  const rows = await fetchPage(filter, anilistPage, search);
  const canonical = await canonicalizePage(rows);
  return canonical.slice(pageOffset, pageOffset + NUVIO_PAGE_SIZE);
}

export function getRollingCatalogRange(id, date) {
  const baseId = getBaseCatalogId(id);
  if (baseId === "upcoming_5_days") return getNext5DaysRangeManila(date);
  if (baseId === "previous_7_days") return getPrevious7DaysRangeManila(date);
  return null;
}

export function isEligibleRollingMedia(media) {
  return media?.isAdult === false
    && ["TV", "TV_SHORT", "ONA", "OVA", "SPECIAL", "MOVIE"].includes(media?.format);
}

export async function buildRollingCatalog(id, date, skip, search, {
  fetchPage = queryAiringSchedulePage,
  maxPages = MAX_SCHEDULE_PAGES,
  pageSize = NUVIO_PAGE_SIZE,
} = {}) {
  const range = getRollingCatalogRange(id, date);
  if (!range) return [];

  const identityMode = getCatalogIdentityMode(id);
  const futureOnly = getBaseCatalogId(id) === "upcoming_5_days";
  const sort = futureOnly ? "TIME" : "TIME_DESC";

  return collectValidatedCatalogPage({
    skip,
    pageSize,
    maxPages,
    fetchPage: (page) => fetchPage(range.start, range.end, futureOnly, page, sort),
    canonicalizePage: async (rows) => {
      const metas = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const media = row?.media;
        const mediaId = media?.id;
        if (!Number.isInteger(Number(mediaId)) || Number(mediaId) <= 0) continue;
        if (!isEligibleRollingMedia(media)) continue;
        const meta = toCatalogIdentity(toMetaFromAniList(mediaId, media), identityMode);
        if (!meta) continue;
        meta.type = "series";
        meta.extra = {
          ...meta.extra,
          episode: row.episode,
          airingAt: row.airingAt,
          ...(futureOnly ? {
            nextEpisode: row.episode,
            nextAiringAt: row.airingAt,
          } : {}),
        };
        metas.push(meta);
      }
      return filterCatalogMetasBySearch(metas, search);
    },
  });
}

export async function buildCatalog(id, info, skip, search) {
  const identityMode = getCatalogIdentityMode(id);
  const filter = getCatalogFilter(id, info);
  if (filter) {
    if (identityMode === "mal") {
      return fetchValidatedSeasonCatalogPage({
        filter,
        skip,
        search,
        fetchPage: (catalogFilter, page, catalogSearch) =>
          queryAnime(catalogFilter, page, catalogSearch, { includeMalId: true }),
        canonicalizePage: (rows) => canonicalizeCatalogPage(rows, { identityMode }),
      });
    }
    return fetchValidatedSeasonCatalogPage({ filter, skip, search });
  }
  if (getRollingCatalogRange(id, new Date())) return buildRollingCatalog(id, new Date(), skip, search);
  return [];
}

function send(res, body, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400");
  return res.json(body);
}

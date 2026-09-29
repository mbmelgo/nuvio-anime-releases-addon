import { canonicalizeCatalogMetas, canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";
import {
  ANILIST_PAGE_SIZE,
  MAX_CATALOG_FILL_PAGES,
  buildCatalogMediaVariables,
  catalogDefinitions as getCatalogDefinitions,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  getSeasonInfo as getSeasonInfoValue,
  parseCatalogExtraPath,
} from "../lib/catalog-config.js";
import { filterCatalogMetasBySearch, toMeta } from "../lib/catalog-meta.js";
import { queryAnime } from "../lib/catalog-anilist.js";
import { scheduleCatalog } from "../lib/catalog-schedule.js";
import { collectValidatedCatalogPage } from "../lib/catalog-pagination.js";

export {
  ANILIST_PAGE_SIZE,
  MAX_CATALOG_FILL_PAGES,
  buildCatalogMediaVariables,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  parseCatalogExtraPath,
  filterCatalogMetasBySearch,
  toMeta,
};

export function catalogDefinitions(info) {
  return getCatalogDefinitions(info);
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

  if (resource === "catalog" && type === "series") {
    if (!catalogDefinitions(seasonInfo).some((catalog) => catalog.id === id)) {
      return send(res, { metas: [] }, 404);
    }
    try {
      const skip = Math.max(0, Number(query.skip || 0) || 0);
      const search = String(query.search || "").trim();
      return send(res, { metas: await buildCatalog(id, seasonInfo, now, skip, search) });
    } catch (error) {
      console.error("[catalog]", error);
      return send(res, { metas: [] }, 500);
    }
  }

  return send(res, { error: "Not found" }, 404);
}

export function getCatalogFilter(id, info) {
  if (id === "current_season") return { season: info.ongoing, sort: ["START_DATE", "TITLE_ROMAJI"] };
  if (id === "previous_season") return { season: info.previous, sort: ["START_DATE", "SCORE_DESC", "TITLE_ROMAJI"] };
  if (id === "upcoming_season") return { season: info.upcoming, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"] };
  return null;
}

export async function canonicalizeCatalogPage(metas, options = {}) {
  if (!Array.isArray(metas) || metas.length === 0) return [];

  const fast = options.fastCanonicalize || canonicalizeCatalogMetasFast;
  const full = options.fullCanonicalize || canonicalizeCatalogMetas;
  const fastResult = await fast(metas, options);
  const resolvedIds = new Set(fastResult.map((meta) => String(meta?.extra?.originalCatalogId || meta?.id || "")));
  const unresolved = metas.filter((meta) => !resolvedIds.has(String(meta?.id || "")));

  if (!unresolved.length) return fastResult;

  // The fast resolver deliberately avoids expensive relationship/provider
  // traversal. Only candidates that remain unresolved are sent through the
  // complete canonical resolver, which already contains bounded root/season
  // recovery logic. Never expose a fallback identity that the fast path would
  // reject as unsupported.
  let recovered = [];
  try {
    const fullResult = await full(unresolved, options);
    recovered = fullResult.filter((meta) => /^(tvdb|tmdb|imdb):/.test(String(meta?.id || "")));
  } catch {}

  const recoveredIds = new Set(recovered.map((meta) => String(meta?.extra?.originalCatalogId || "")));
  const combined = [...fastResult, ...recovered];
  return combined.filter((meta) => {
    const originalId = String(meta?.extra?.originalCatalogId || meta?.id || "");
    return resolvedIds.has(originalId) || recoveredIds.has(originalId);
  });
}

export async function buildCatalog(id, info, now, skip, search) {
  if (id === "new_episodes") {
    const range = getLast7DaysRangeManila(now);
    return scheduleCatalog(range.start, range.end, false, skip, search);
  }
  if (id === "upcoming_episodes") {
    const range = getNext7DaysRangeManila(now);
    return scheduleCatalog(range.start, range.end, true, skip, search);
  }

  const filter = getCatalogFilter(id, info);
  if (!filter) return [];

  return collectValidatedCatalogPage({
    skip,
    pageSize: ANILIST_PAGE_SIZE,
    maxPages: MAX_CATALOG_FILL_PAGES,
    fetchPage: (page) => queryAnime(filter, page, search),
    canonicalizePage: (metas) => canonicalizeCatalogPage(metas),
  });
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

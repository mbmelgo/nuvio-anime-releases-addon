import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";
import {
  ANILIST_PAGE_SIZE,
  MAX_CATALOG_ITEMS,
  MAX_ANILIST_PAGES,
  buildCatalogMediaVariables,
  catalogDefinitions,
  getCatalogPageCount,
  getCatalogPagePlan,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  getSeasonInfo,
  parseCatalogExtraPath,
} from "../lib/catalog-config.js";
import { filterCatalogMetasBySearch, toMeta } from "../lib/catalog-meta.js";
import { queryAnime } from "../lib/catalog-anilist.js";
import { scheduleCatalog } from "../lib/catalog-schedule.js";

export {
  ANILIST_PAGE_SIZE,
  MAX_CATALOG_ITEMS,
  MAX_ANILIST_PAGES,
  buildCatalogMediaVariables,
  catalogDefinitions,
  getCatalogPageCount,
  getCatalogPagePlan,
  getLast7DaysRangeManila,
  getNext7DaysRangeManila,
  getSeasonInfo,
  parseCatalogExtraPath,
  filterCatalogMetasBySearch,
  toMeta,
};

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

  const plan = getCatalogPagePlan(skip);
  if (!plan.limit) return [];

  // One AniList request per Nuvio page. Vercel serverless invocations should
  // not walk the entire season to construct a single catalog response.
  const rows = await queryAnime(filter, plan.page, search);
  const canonical = await canonicalizeCatalogMetasFast(rows);

  // AniList applies the search term server-side. Keep this as a defensive
  // check for alternate titles exposed by canonical metadata.
  const searched = search ? filterCatalogMetasBySearch(canonical, search) : canonical;
  return searched.slice(plan.offset, plan.offset + ANILIST_PAGE_SIZE);
}

// Kept as a compatibility no-op. Catalog generation no longer depends on
// per-instance in-memory caches, which are not durable across Vercel workers.
export function clearCatalogSourceCache() {}

function send(res, body, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400");
  return res.json(body);
}

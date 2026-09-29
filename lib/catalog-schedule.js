import { canonicalizeCatalogMetas } from "./kitsu-canonical.js";
import { ANILIST_PAGE_SIZE, MAX_ANILIST_PAGES } from "./catalog-config.js";
import { filterCatalogMetasBySearch, toMeta } from "./catalog-meta.js";
import { queryAiringSchedulePage } from "./catalog-anilist.js";

/*
 * Schedule catalogs are different from season catalogs: AniList paginates
 * airing events, while this addon exposes one item per anime. Keep each
 * serverless invocation bounded to the requested AniList page instead of
 * downloading the entire seven-day schedule.
 */
export async function scheduleCatalog(start, end, futureOnly, skip, search) {
  const page = Math.floor(Math.max(0, Number(skip) || 0) / ANILIST_PAGE_SIZE) + 1;
  if (page > MAX_ANILIST_PAGES) return [];

  const schedules = await queryAiringSchedulePage(start, end, futureOnly, page);
  const latestByAnime = new Map();

  for (const schedule of schedules) {
    const media = schedule.media;
    if (!media || media.format !== "TV") continue;
    const existing = latestByAnime.get(media.id);
    if (!existing || schedule.airingAt > existing.airingAt) latestByAnime.set(media.id, schedule);
  }

  const metas = [...latestByAnime.values()]
    .sort((a, b) => futureOnly ? a.airingAt - b.airingAt : b.airingAt - a.airingAt)
    .map((s) => toMeta(s.media, { episode: s.episode, airingAt: s.airingAt }))
    .filter(Boolean);

  const searched = filterCatalogMetasBySearch(metas, search);
  const canonical = await canonicalizeCatalogMetas(searched);
  return canonical.slice(0, ANILIST_PAGE_SIZE);
}

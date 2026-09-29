import { canonicalizeCatalogMetasFast } from "./kitsu-canonical.js";
import { ANILIST_PAGE_SIZE, MAX_ANILIST_PAGES } from "./catalog-config.js";
import { filterCatalogMetasBySearch, toMeta } from "./catalog-meta.js";
import { queryAiringSchedulePage } from "./catalog-anilist.js";

/*
 * Schedule catalogs are different from season catalogs: AniList paginates
 * airing events, while this addon exposes one item per anime. A single
 * AniList event page can contain several episodes for the same anime, so
 * mapping one AniList page directly to one catalog page can under-fill the
 * Nuvio page. Fetch only as many schedule pages as needed to produce the
 * requested number of unique matching anime, then canonicalize only that
 * final page.
 */
export function selectSchedulePage(schedules, futureOnly, skip, search = "") {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const latestByAnime = new Map();

  for (const schedule of Array.isArray(schedules) ? schedules : []) {
    const media = schedule?.media;
    if (!media || media.format !== "TV") continue;

    const existing = latestByAnime.get(media.id);
    if (!existing) {
      latestByAnime.set(media.id, schedule);
    } else if (futureOnly) {
      if (schedule.airingAt < existing.airingAt) latestByAnime.set(media.id, schedule);
    } else if (schedule.airingAt > existing.airingAt) {
      latestByAnime.set(media.id, schedule);
    }
  }

  const metas = [...latestByAnime.values()]
    .sort((a, b) => futureOnly ? a.airingAt - b.airingAt : b.airingAt - a.airingAt)
    .map((schedule) => toMeta(schedule.media, { episode: schedule.episode, airingAt: schedule.airingAt }))
    .filter(Boolean);

  return filterCatalogMetasBySearch(metas, search).slice(normalizedSkip, normalizedSkip + ANILIST_PAGE_SIZE);
}

export async function scheduleCatalog(start, end, futureOnly, skip, search) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const targetCount = normalizedSkip + ANILIST_PAGE_SIZE;
  const allSchedules = [];
  const seenScheduleIds = new Set();

  for (let page = 1; page <= MAX_ANILIST_PAGES; page++) {
    const schedules = await queryAiringSchedulePage(start, end, futureOnly, page);
    if (!schedules.length) break;

    for (const schedule of schedules) {
      const key = schedule?.id ?? `${schedule?.media?.id}:${schedule?.airingAt}:${schedule?.episode}`;
      if (seenScheduleIds.has(key)) continue;
      seenScheduleIds.add(key);
      allSchedules.push(schedule);
    }

    const pageItems = selectSchedulePage(allSchedules, futureOnly, 0, search);
    if (pageItems.length >= targetCount || schedules.length < ANILIST_PAGE_SIZE) break;
  }

  const page = selectSchedulePage(allSchedules, futureOnly, normalizedSkip, search);
  return canonicalizeCatalogMetasFast(page);
}

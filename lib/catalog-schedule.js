import { canonicalizeCatalogMetasFast } from "./kitsu-canonical.js";
import { NUVIO_PAGE_SIZE } from "./catalog-config.js";
import { filterCatalogMetasBySearch, toMeta } from "./catalog-meta.js";
import { queryAiringSchedulePage } from "./catalog-anilist.js";

/*
 * AniList paginates airing events, while this addon exposes one item per anime.
 * A single 50-event upstream page is intentionally enough for one Nuvio page.
 * We deduplicate that batch but do not fetch additional AniList pages merely
 * to fill the Nuvio page back to 50 unique anime. This keeps schedule requests
 * bounded and avoids request amplification/rate-limit pressure.
 */
export function selectScheduleMetas(schedules, futureOnly, search = "") {
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

  return filterCatalogMetasBySearch(metas, search);
}

export function selectSchedulePage(schedules, futureOnly, skip, search = "") {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  return selectScheduleMetas(schedules, futureOnly, search).slice(normalizedSkip, normalizedSkip + NUVIO_PAGE_SIZE);
}

export async function scheduleCatalog(start, end, futureOnly, skip, search, fetchPage = queryAiringSchedulePage) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const schedules = await fetchPage(start, end, futureOnly, Math.floor(normalizedSkip / NUVIO_PAGE_SIZE) + 1);
  const page = selectSchedulePage(schedules, futureOnly, normalizedSkip % NUVIO_PAGE_SIZE, search);
  return canonicalizeCatalogMetasFast(page);
}

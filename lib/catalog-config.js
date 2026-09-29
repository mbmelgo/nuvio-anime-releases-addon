const TIME_ZONE = "Asia/Manila";

// Keep catalog pages intentionally small. Nuvio requests additional pages via
// `skip`, so a small page bounds the work and latency of each Vercel
// serverless invocation instead of making every request resolve 50 items.
export const ANILIST_PAGE_SIZE = 10;
export const MAX_CATALOG_ITEMS = 1000;
export const MAX_ANILIST_PAGES = Math.ceil(MAX_CATALOG_ITEMS / ANILIST_PAGE_SIZE);
export const FETCH_TIMEOUT_MS = 8000;
export const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function parseCatalogExtraPath(value) {
  const result = {};
  const parts = String(value || "").split("&");
  for (let index = 0; index < parts.length; index++) {
    const pair = parts[index];
    if (!pair) continue;
    const separator = pair.indexOf("=");
    const rawKey = separator >= 0 ? pair.slice(0, separator) : pair;
    let rawValue = separator >= 0 ? pair.slice(separator + 1) : "";
    if (!rawKey) continue;
    if (index === parts.length - 1) rawValue = rawValue.replace(/\.json$/i, "");
    try {
      result[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue);
    } catch {
      result[rawKey] = rawValue;
    }
  }
  return result;
}

export function catalogDefinitions(info) {
  const current = `${prettySeason(info.ongoing.season)} ${info.ongoing.year}`;
  const previous = `${prettySeason(info.previous.season)} ${info.previous.year}`;
  const upcoming = `${prettySeason(info.upcoming.season)} ${info.upcoming.year}`;
  const extra = [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }];
  return [
    { type: "series", id: "upcoming_season", name: `Upcoming Season — ${upcoming}`, extra },
    { type: "series", id: "current_season", name: `Current Season — ${current}`, extra },
    { type: "series", id: "previous_season", name: `Previous Season — ${previous}`, extra },
    { type: "series", id: "new_episodes", name: "Latest Anime — Last 7 Days", extra },
    { type: "series", id: "upcoming_episodes", name: "Upcoming Anime — Next 7 Days", extra },
  ];
}

export function getCatalogPageCount(itemCount) {
  return Math.ceil(Math.min(Math.max(0, Number(itemCount) || 0), MAX_CATALOG_ITEMS) / ANILIST_PAGE_SIZE);
}

export function getCatalogPagePlan(skip) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  if (normalizedSkip >= MAX_CATALOG_ITEMS) {
    return { page: MAX_ANILIST_PAGES + 1, offset: 0, limit: 0 };
  }
  return {
    page: Math.floor(normalizedSkip / ANILIST_PAGE_SIZE) + 1,
    offset: normalizedSkip % ANILIST_PAGE_SIZE,
    limit: ANILIST_PAGE_SIZE,
  };
}

export function buildCatalogMediaVariables(filter, page, search = "") {
  const normalizedSearch = String(search || "").trim();
  return {
    page: page || 1,
    season: filter.season?.season,
    seasonYear: filter.season?.year,
    status: filter.status,
    sort: filter.sort,
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
  };
}

export function getSeasonInfo(date) {
  const { month, year } = getManilaDateParts(date);
  if (month <= 3) return { previous: { season: "FALL", year: year - 1 }, ongoing: { season: "WINTER", year }, upcoming: { season: "SPRING", year } };
  if (month <= 6) return { previous: { season: "WINTER", year }, ongoing: { season: "SPRING", year }, upcoming: { season: "SUMMER", year } };
  if (month <= 9) return { previous: { season: "SPRING", year }, ongoing: { season: "SUMMER", year }, upcoming: { season: "FALL", year } };
  return { previous: { season: "SUMMER", year }, ongoing: { season: "FALL", year }, upcoming: { season: "WINTER", year: year + 1 } };
}

export function getLast7DaysRangeManila(date) {
  const now = new Date(date).getTime();
  return { start: now - ROLLING_WINDOW_MS, end: now };
}

export function getNext7DaysRangeManila(date) {
  const now = new Date(date).getTime();
  return { start: now, end: now + ROLLING_WINDOW_MS };
}

function getManilaDateParts(date) {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" });
  const result = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }
  return result;
}

function prettySeason(season) {
  return season.charAt(0) + season.slice(1).toLowerCase();
}

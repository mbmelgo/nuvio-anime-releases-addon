const ANILIST_URL = "https://graphql.anilist.co";
const TIME_ZONE = "Asia/Manila";
const PAGE_SIZE = 50;
const MAX_SCHEDULE_PAGES = 8;
const FETCH_TIMEOUT_MS = 8000;

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  const query = req.query || {};
  const resource = query.resource || parts[0];
  const type = query.type || parts[1];
  const rawId = query.id || parts[2]?.replace(/\.json$/, "");
  const id = rawId ? decodeURIComponent(String(rawId).replace(/\.json$/, "")) : "";
  const now = new Date();
  const seasonInfo = getSeasonInfo(now);

  if (req.method === "OPTIONS") return send(res, {}, 200);

  if (resource === "catalog" && type === "series") {
    if (!catalogDefinitions(seasonInfo).some((catalog) => catalog.id === id)) return send(res, { metas: [] }, 404);
    try {
      const skip = Math.max(0, Number(query.skip || 0) || 0);
      return send(res, { metas: await buildCatalog(id, seasonInfo, now, skip) });
    } catch (error) {
      console.error("[catalog]", error);
      return send(res, { metas: [] }, 500);
    }
  }

  return send(res, { error: "Not found" }, 404);
}

const MEDIA_FIELDS = `id idMal title { romaji english native } coverImage { large } bannerImage description genres duration format status season seasonYear episodes averageScore popularity trending favourites countryOfOrigin source siteUrl startDate { year month day } endDate { year month day } nextAiringEpisode { episode airingAt }`;

export function catalogDefinitions(info) {
  const current = `${prettySeason(info.ongoing.season)} ${info.ongoing.year}`;
  const previous = `${prettySeason(info.previous.season)} ${info.previous.year}`;
  const upcoming = `${prettySeason(info.upcoming.season)} ${info.upcoming.year}`;
  return [
    { type: "series", id: "upcoming_season", name: `Upcoming Season — ${upcoming}` },
    { type: "series", id: "current_season", name: `Current Season — ${current}` },
    { type: "series", id: "previous_season", name: `Previous Season — ${previous}` },
    { type: "series", id: "new_episodes", name: "Latest Anime — Last 7 Days" },
    { type: "series", id: "upcoming_episodes", name: "Upcoming Anime — Next 7 Days" },
  ];
}

async function buildCatalog(id, info, now, skip) {
  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const offset = skip % PAGE_SIZE;
  if (id === "new_episodes") {
    const range = getLast7DaysRangeManila(now);
    return scheduleCatalog(range.start, range.end, false, offset);
  }
  if (id === "upcoming_episodes") {
    const range = getNext7DaysRangeManila(now);
    return scheduleCatalog(range.start, range.end, true, offset);
  }
  if (id === "current_season") {
    return (await queryAnime({ season: info.ongoing, sort: ["START_DATE", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  }
  if (id === "previous_season") {
    return (await queryAnime({ season: info.previous, sort: ["START_DATE", "SCORE_DESC", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  }
  if (id === "upcoming_season") {
    return (await queryAnime({ season: info.upcoming, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  }
  return [];
}

async function queryAnime(filter) {
  const query = `query ($page:Int,$season:MediaSeason,$seasonYear:Int,$status:MediaStatus,$sort:[MediaSort]) { Page(page:$page,perPage:${PAGE_SIZE}) { media(type:ANIME,format:TV,season:$season,seasonYear:$seasonYear,status:$status,sort:$sort,isAdult:false) { ${MEDIA_FIELDS} } } }`;
  const data = await anilist(query, { page: filter.page || 1, season: filter.season?.season, seasonYear: filter.season?.year, status: filter.status, sort: filter.sort });
  return (data?.Page?.media || []).map((media) => toMeta(media, media.nextAiringEpisode)).filter(Boolean);
}

async function scheduleCatalog(start, end, futureOnly, offset) {
  const schedules = await queryAiringSchedule(start, end, futureOnly);
  const latestByAnime = new Map();
  for (const schedule of schedules) {
    const media = schedule.media;
    if (!media || media.format !== "TV") continue;
    const existing = latestByAnime.get(media.id);
    if (!existing || schedule.airingAt > existing.airingAt) latestByAnime.set(media.id, schedule);
  }
  return [...latestByAnime.values()]
    .sort((a, b) => futureOnly ? a.airingAt - b.airingAt : b.airingAt - a.airingAt)
    .slice(offset, offset + PAGE_SIZE)
    .map((s) => toMeta(s.media, { episode: s.episode, airingAt: s.airingAt }))
    .filter(Boolean);
}

async function queryAiringSchedule(start, end, futureOnly) {
  const all = [];
  for (let page = 1; page <= MAX_SCHEDULE_PAGES; page++) {
    const query = `query ($page:Int,$start:Int,$end:Int,$notYetAired:Boolean) { Page(page:$page,perPage:${PAGE_SIZE}) { airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,notYetAired:$notYetAired,sort:TIME_DESC) { id airingAt episode media { ${MEDIA_FIELDS} } } } }`;
    const data = await anilist(query, { page, start: Math.floor(start / 1000), end: Math.floor(end / 1000), notYetAired: futureOnly });
    const rows = data?.Page?.airingSchedules || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

function toMeta(media, episode) {
  if (!media) return null;
  const id = media.idMal ? `mal:${media.idMal}` : `anilist:${media.id}`;
  const extra = { anilistId: media.id, ...(media.idMal ? { malId: media.idMal } : {}), ...(media.averageScore ? { anilistScore: media.averageScore / 10 } : {}), ...(media.popularity != null ? { popularity: media.popularity } : {}), ...(media.trending != null ? { trending: media.trending } : {}), ...(media.favourites != null ? { favourites: media.favourites } : {}), ...(media.episodes != null ? { totalEpisodes: media.episodes } : {}), ...(media.source ? { source: media.source } : {}), ...(media.status ? { status: media.status } : {}) };
  if (episode?.episode != null) extra.episode = episode.episode;
  if (episode?.airingAt != null) extra.airingAt = episode.airingAt;
  if (media.nextAiringEpisode) { extra.nextEpisode = media.nextAiringEpisode.episode; extra.nextAiringAt = media.nextAiringEpisode.airingAt; }
  const meta = { id, type: "series", name: media.title?.english || media.title?.romaji || media.title?.native || `Anime ${media.id}`, posterShape: "poster", extra };
  if (media.coverImage?.large) meta.poster = media.coverImage.large;
  if (media.bannerImage) meta.background = media.bannerImage;
  if (media.description) meta.description = cleanDescription(media.description);
  if (media.genres?.length) meta.genres = media.genres;
  if (media.duration) meta.runtime = `${media.duration} min`;
  if (media.countryOfOrigin) meta.country = media.countryOfOrigin;
  if (media.siteUrl) meta.website = media.siteUrl;
  if (media.startDate?.year) {
    const startYear = media.startDate.year;
    const endYear = media.endDate?.year;
    meta.releaseInfo = media.status === "RELEASING" ? `${startYear}-` : endYear && endYear !== startYear ? `${startYear}-${endYear}` : String(startYear);
    if (media.startDate.month && media.startDate.day) meta.released = new Date(Date.UTC(media.startDate.year, media.startDate.month - 1, media.startDate.day)).toISOString();
  }
  const links = [];
  if (media.siteUrl) links.push({ name: "AniList", category: "database", url: media.siteUrl });
  if (media.idMal) links.push({ name: "MyAnimeList", category: "database", url: `https://myanimelist.net/anime/${media.idMal}` });
  if (links.length) meta.links = links;
  return meta;
}

function cleanDescription(value) { return String(value).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/\r\n/g, "\n").trim(); }
async function anilist(query, variables) { const response = await fetchWithTimeout(ANILIST_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables }) }); const json = await response.json().catch(() => ({})); if (!response.ok || json.errors) throw new Error(json.errors?.map((x) => x.message).join("; ") || `AniList HTTP ${response.status}`); return json.data; }
async function fetchWithTimeout(url, options = {}) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS); try { return await fetch(url, { ...options, signal: controller.signal }); } finally { clearTimeout(timer); } }
export function getSeasonInfo(date) { const { month, year } = getManilaDateParts(date); if (month <= 3) return { previous: { season: "FALL", year: year - 1 }, ongoing: { season: "WINTER", year }, upcoming: { season: "SPRING", year } }; if (month <= 6) return { previous: { season: "WINTER", year }, ongoing: { season: "SPRING", year }, upcoming: { season: "SUMMER", year } }; if (month <= 9) return { previous: { season: "SPRING", year }, ongoing: { season: "SUMMER", year }, upcoming: { season: "FALL", year } }; return { previous: { season: "SUMMER", year }, ongoing: { season: "FALL", year }, upcoming: { season: "WINTER", year: year + 1 } }; }
function getManilaDateParts(date) { const formatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" }); const result = {}; for (const part of formatter.formatToParts(date)) if (part.type !== "literal") result[part.type] = Number(part.value); return result; }
const ROLLING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export function getLast7DaysRangeManila(date) { const now = new Date(date).getTime(); return { start: now - ROLLING_WINDOW_MS, end: now }; }
export function getNext7DaysRangeManila(date) { const now = new Date(date).getTime(); return { start: now, end: now + ROLLING_WINDOW_MS }; }
function prettySeason(season) { return season.charAt(0) + season.slice(1).toLowerCase(); }
function send(res, body, status = 200) { res.status(status); res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400"); return res.json(body); }

import { ADDON_VERSION } from "./version.js";

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
  if (resource === "manifest" || (parts.length === 1 && parts[0] === "manifest.json")) return send(res, buildManifest(seasonInfo));

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

function buildManifest(info) {
  return {
    id: "com.marki.nuvio.anime-releases",
    version: ADDON_VERSION,
    name: "Anime Releases for Nuvio",
    description: "Season-aware anime release catalogs for Nuvio and Stremio-compatible clients. Detailed metadata is delegated to Bingecat.",
    resources: [{ name: "catalog", types: ["series"] }],
    types: ["series"],
    catalogs: catalogDefinitions(info),
  };
}

const MEDIA_FIELDS = `id idMal title { romaji english native } coverImage { large } bannerImage description genres duration format status season seasonYear episodes averageScore popularity trending favourites countryOfOrigin source siteUrl startDate { year month day } endDate { year month day } nextAiringEpisode { episode airingAt }`;

function catalogDefinitions(info) {
  const current = `${prettySeason(info.ongoing.season)} ${info.ongoing.year}`;
  const previous = `${prettySeason(info.previous.season)} ${info.previous.year}`;
  const upcoming = `${prettySeason(info.upcoming.season)} ${info.upcoming.year}`;
  return [
    { type: "series", id: "ongoing", name: `Ongoing — ${current}` },
    { type: "series", id: "airing_today", name: "Airing Today" },
    { type: "series", id: "new_episodes", name: "New Episodes — Last 7 Days" },
    { type: "series", id: "next_episodes", name: "Next Episodes — Next 7 Days" },
    { type: "series", id: "upcoming", name: `Upcoming — ${upcoming}` },
    { type: "series", id: "finished_current", name: `Finished — ${current}` },
    { type: "series", id: "previous_season", name: `Previous Season — ${previous}` },
    { type: "series", id: "popular_current", name: `Popular — ${current}` },
    { type: "series", id: "top_rated_current", name: `Top Rated — ${current}` },
    { type: "series", id: "trending_current", name: `Trending — ${current}` },
  ];
}

async function buildCatalog(id, info, now, skip) {
  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const offset = skip % PAGE_SIZE;
  if (id === "airing_today") { const r = getManilaDayRange(now, 0, 1); return scheduleCatalog(r.start, r.end, false, offset); }
  if (id === "new_episodes") { const r = getLast7DaysRangeManila(now); return scheduleCatalog(r.start, r.end, false, offset); }
  if (id === "next_episodes") { const r = getManilaDayRange(now, 0, 7); return scheduleCatalog(r.start, r.end, true, offset); }
  if (id === "ongoing") {
    const results = await Promise.all([
      queryAnime({ season: info.ongoing, status: "RELEASING", sort: ["START_DATE", "TITLE_ROMAJI"], page }),
      queryAnime({ season: info.previous, status: "RELEASING", sort: ["START_DATE", "TITLE_ROMAJI"], page }),
    ]);
    return dedupe(results.flat()).slice(offset, offset + PAGE_SIZE);
  }
  if (id === "upcoming") return (await queryAnime({ season: info.upcoming, status: "NOT_YET_RELEASED", sort: ["START_DATE", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  if (id === "finished_current") return (await queryAnime({ season: info.ongoing, status: "FINISHED", sort: ["END_DATE_DESC", "SCORE_DESC", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  if (id === "previous_season") return (await queryAnime({ season: info.previous, sort: ["START_DATE", "SCORE_DESC", "TITLE_ROMAJI"], page })).slice(offset, offset + PAGE_SIZE);
  const ranked = { popular_current: ["POPULARITY_DESC", "SCORE_DESC", "TITLE_ROMAJI"], top_rated_current: ["SCORE_DESC", "POPULARITY_DESC", "TITLE_ROMAJI"], trending_current: ["TRENDING_DESC", "POPULARITY_DESC", "TITLE_ROMAJI"] };
  if (ranked[id]) return (await queryAnime({ season: info.ongoing, sort: ranked[id], page })).slice(offset, offset + PAGE_SIZE);
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
  return [...latestByAnime.values()].sort((a, b) => futureOnly ? a.airingAt - b.airingAt : b.airingAt - a.airingAt).slice(offset, offset + PAGE_SIZE).map((s) => toMeta(s.media, { episode: s.episode, airingAt: s.airingAt })).filter(Boolean);
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
function getSeasonInfo(date) { const { month, year } = getManilaDateParts(date); if (month <= 3) return { previous: { season: "FALL", year: year - 1 }, ongoing: { season: "WINTER", year }, upcoming: { season: "SPRING", year } }; if (month <= 6) return { previous: { season: "WINTER", year }, ongoing: { season: "SPRING", year }, upcoming: { season: "SUMMER", year } }; if (month <= 9) return { previous: { season: "SPRING", year }, ongoing: { season: "SUMMER", year }, upcoming: { season: "FALL", year } }; return { previous: { season: "SUMMER", year }, ongoing: { season: "FALL", year }, upcoming: { season: "WINTER", year: year + 1 } }; }
function getManilaDateParts(date) { const formatter = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric", month: "numeric", day: "numeric" }); const result = {}; for (const part of formatter.formatToParts(date)) if (part.type !== "literal") result[part.type] = Number(part.value); return result; }
function getLast7DaysRangeManila(date) { return getManilaDayRange(date, -6, 1); }
function getManilaDayRange(date, startOffset, endOffset) { const p = getManilaDateParts(date); return { start: manilaDateToUtc(p.year, p.month, p.day + startOffset, 0, 0, 0).getTime(), end: manilaDateToUtc(p.year, p.month, p.day + endOffset, 0, 0, 0).getTime() }; }
function manilaDateToUtc(year, month, day, hour, minute, second) { return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second)); }
function prettySeason(season) { return season.charAt(0) + season.slice(1).toLowerCase(); }
function dedupe(items) { const map = new Map(); for (const item of items) if (item && !map.has(item.id)) map.set(item.id, item); return [...map.values()].sort((a, b) => (a.extra?.airingAt ?? Infinity) - (b.extra?.airingAt ?? Infinity)); }
function send(res, body, status = 200) { res.status(status); res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400, stale-if-error=86400"); return res.json(body); }

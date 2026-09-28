import { ADDON_VERSION } from "./version.js";

const ANILIST_URL = "https://graphql.anilist.co";
const JIKAN_URL = "https://api.jikan.moe/v4";
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
  const resolver = normalizeResolver(query.resolver);
  const now = new Date();
  const seasonInfo = getSeasonInfo(now);

  if (req.method === "OPTIONS") return send(res, {}, 200);
  if (resource === "manifest" || (parts.length === 1 && parts[0] === "manifest.json")) return send(res, buildManifest(seasonInfo, resolver));

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

  if (resource === "meta" && type === "series") {
    try {
      const meta = await buildDetailedMeta(id);
      return meta ? send(res, { meta }) : send(res, { meta: null }, 404);
    } catch (error) {
      console.error("[meta]", error);
      return send(res, { meta: null }, 500);
    }
  }

  return send(res, { error: "Not found" }, 404);
}

export function normalizeResolver(value) {
  return String(value || "v4").toLowerCase() === "v5" ? "v5" : "v4";
}

export function buildManifest(info, resolver = "v4") {
  const selected = normalizeResolver(resolver);
  return {
    id: `com.marki.nuvio.anime-releases.${selected}`,
    version: ADDON_VERSION,
    name: `Anime Releases for Nuvio (${selected})`,
    description: `Season-aware anime catalogs and detailed series metadata using the ${selected} metadata resolver.`,
    resources: [
      { name: "catalog", types: ["series"] },
      { name: "meta", types: ["series"], idPrefixes: ["mal:", "anilist:"] },
    ],
    types: ["series"],
    catalogs: catalogDefinitions(info),
  };
}

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
  const ranked = {
    popular_current: ["POPULARITY_DESC", "SCORE_DESC", "TITLE_ROMAJI"],
    top_rated_current: ["SCORE_DESC", "POPULARITY_DESC", "TITLE_ROMAJI"],
    trending_current: ["TRENDING_DESC", "POPULARITY_DESC", "TITLE_ROMAJI"],
  };
  if (ranked[id]) return (await queryAnime({ season: info.ongoing, sort: ranked[id], page })).slice(offset, offset + PAGE_SIZE);
  return [];
}

const MEDIA_FIELDS = `
  id idMal title { romaji english native } coverImage { large } bannerImage description genres duration format status season seasonYear episodes averageScore popularity trending favourites countryOfOrigin source siteUrl
  startDate { year month day } endDate { year month day } nextAiringEpisode { episode airingAt }
`;

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

async function buildDetailedMeta(id) {
  const parsed = parseExternalId(id);
  if (!parsed) return null;
  const media = await getAnimeMedia(parsed);
  if (!media) return null;

  let episodes = [];
  if (media.idMal) {
    try { episodes = await jikanEpisodeList(media.idMal); }
    catch (error) { console.warn("[meta] Jikan episode enrichment failed:", error.message); }
  }

  const meta = toDetailedMeta(media);
  meta.videos = buildEpisodeVideos(meta.id, media, episodes);
  return meta;
}

function parseExternalId(id) {
  const match = String(id || "").trim().match(/^(mal|anilist):([0-9]+)$/i);
  return match ? { source: match[1].toLowerCase(), value: Number(match[2]) } : null;
}

async function getAnimeMedia(parsed) {
  const query = `query ($id:Int,$idMal:Int) { Media(id:$id,idMal:$idMal,type:ANIME) { ${MEDIA_FIELDS} relations { edges { relationType node { id idMal type format status episodes season seasonYear title { romaji english native } startDate { year month day } endDate { year month day } coverImage { large } } } } } }`;
  const variables = parsed.source === "mal" ? { idMal: parsed.value } : { id: parsed.value };
  const data = await anilist(query, variables);
  return data?.Media || null;
}

async function jikanEpisodeList(malId) {
  const all = [];
  for (let page = 1; page <= 5; page++) {
    const response = await fetchWithTimeout(`${JIKAN_URL}/anime/${malId}/episodes?page=${page}`);
    if (!response.ok) throw new Error(`Jikan HTTP ${response.status}`);
    const json = await response.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    all.push(...rows);
    if (!json?.pagination?.has_next_page || rows.length === 0) break;
  }
  return all;
}

function toDetailedMeta(media) {
  const id = media.idMal ? `mal:${media.idMal}` : `anilist:${media.id}`;
  const meta = {
    id,
    type: "series",
    name: media.title?.english || media.title?.romaji || media.title?.native || `Anime ${media.id}`,
    posterShape: "poster",
    extra: {
      anilistId: media.id,
      ...(media.idMal ? { malId: media.idMal } : {}),
      ...(media.averageScore ? { anilistScore: media.averageScore / 10 } : {}),
      ...(media.popularity != null ? { popularity: media.popularity } : {}),
      ...(media.trending != null ? { trending: media.trending } : {}),
      ...(media.favourites != null ? { favourites: media.favourites } : {}),
      ...(media.episodes != null ? { totalEpisodes: media.episodes } : {}),
      ...(media.source ? { source: media.source } : {}),
      ...(media.status ? { status: media.status } : {}),
    },
  };
  if (media.coverImage?.large) meta.poster = media.coverImage.large;
  if (media.bannerImage) meta.background = media.bannerImage;
  if (media.description) meta.description = cleanDescription(media.description);
  if (media.genres?.length) meta.genres = media.genres;
  if (media.duration) meta.runtime = `${media.duration} min`;
  if (media.countryOfOrigin) meta.country = media.countryOfOrigin;
  if (media.siteUrl) meta.website = media.siteUrl;
  if (media.averageScore != null) meta.imdbRating = String(media.averageScore / 10);
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

function buildEpisodeVideos(metaId, media, episodes) {
  const rows = Array.isArray(episodes) ? episodes : [];
  const total = media.episodes || 0;
  const count = rows.length || total;
  if (!count) return [];
  const season = inferSeasonNumber(media);
  const baseDate = media.startDate?.year ? new Date(Date.UTC(media.startDate.year, (media.startDate.month || 1) - 1, media.startDate.day || 1)).toISOString() : new Date(0).toISOString();
  return Array.from({ length: count }, (_, index) => {
    const row = rows[index] || {};
    const episode = row.mal_id || index + 1;
    return {
      id: `${metaId}:${season}:${episode}`,
      title: row.title || `Episode ${episode}`,
      released: row.aired?.from || baseDate,
      season,
      episode,
      ...(row.synopsis ? { overview: cleanDescription(row.synopsis) } : {}),
      ...(row.images?.jpg?.image_url ? { thumbnail: row.images.jpg.image_url } : {}),
      ...(media.duration ? { runtime: `${media.duration} min` } : {}),
    };
  });
}

function inferSeasonNumber(media) {
  const titles = [media.title?.english, media.title?.romaji, media.title?.native].filter(Boolean);
  for (const title of titles) {
    const match = String(title).match(/season\s*(\d+)/i) || String(title).match(/(\d+)(?:st|nd|rd|th)?\s+season/i);
    if (match) return Number(match[1]);
  }
  return 1;
}

function toMeta(media, episode) {
  if (!media) return null;
  const id = media.idMal ? `mal:${media.idMal}` : `anilist:${media.id}`;
  const extra = {
    anilistId: media.id,
    ...(media.idMal ? { malId: media.idMal } : {}),
    ...(media.averageScore ? { anilistScore: media.averageScore / 10 } : {}),
    ...(media.popularity != null ? { popularity: media.popularity } : {}),
    ...(media.trending != null ? { trending: media.trending } : {}),
    ...(media.favourites != null ? { favourites: media.favourites } : {}),
    ...(media.episodes != null ? { totalEpisodes: media.episodes } : {}),
    ...(media.source ? { source: media.source } : {}),
    ...(media.status ? { status: media.status } : {}),
  };
  return {
    id,
    type: "series",
    name: media.title?.english || media.title?.romaji || media.title?.native || `Anime ${media.id}`,
    poster: media.coverImage?.large,
    posterShape: "poster",
    description: cleanDescription(media.description),
    ...(media.averageScore != null ? { imdbRating: String(media.averageScore / 10) } : {}),
    ...(media.status ? { releaseInfo: media.status === "RELEASING" ? `${media.seasonYear || ""}-` : String(media.seasonYear || "") } : {}),
    extra,
  };
}

async function anilist(query, variables) {
  const response = await fetchWithTimeout(ANILIST_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`AniList HTTP ${response.status}`);
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message || "AniList query failed");
  return json.data;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function cleanDescription(value) {
  return String(value || "").replace(/<br\s*\/?>(\r?\n)?/gi, "\n").replace(/<[^>]+>/g, "").trim();
}

function getSeasonInfo(date) {
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, month: "numeric" }).format(date));
  const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, year: "numeric" }).format(date));
  const season = month <= 3 ? "WINTER" : month <= 6 ? "SPRING" : month <= 9 ? "SUMMER" : "FALL";
  const previous = season === "WINTER" ? { season: "FALL", year: year - 1 } : season === "SPRING" ? { season: "WINTER", year } : season === "SUMMER" ? { season: "SPRING", year } : { season: "SUMMER", year };
  const upcoming = season === "WINTER" ? { season: "SPRING", year } : season === "SPRING" ? { season: "SUMMER", year } : season === "SUMMER" ? { season: "FALL", year } : { season: "WINTER", year: year + 1 };
  return { ongoing: { season, year }, previous, upcoming };
}

function prettySeason(season) { return String(season || "").charAt(0) + String(season || "").slice(1).toLowerCase(); }
function dedupe(rows) { return [...new Map(rows.map((row) => [row.id, row])).values()]; }
function getManilaDayRange(date, startOffset, endOffset) { const local = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date); const start = new Date(`${local}T00:00:00+08:00`); start.setUTCDate(start.getUTCDate() + startOffset); const end = new Date(`${local}T00:00:00+08:00`); end.setUTCDate(end.getUTCDate() + endOffset); return { start: start.getTime(), end: end.getTime() }; }
function getLast7DaysRangeManila(date) { return getManilaDayRange(date, -6, 1); }

function send(res, body, status = 200) { res.status(status); res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type"); res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800"); return res.json(body); }

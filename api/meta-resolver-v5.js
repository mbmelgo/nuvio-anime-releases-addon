import { getAniListByMal, getJikanAnime, getAniZipMapping, getAniZipEpisodes, getJikanEpisodes, discoverTvGraph } from "./lib/providers.js";
import { mergeEpisodeRows, normalizeJikanEpisode } from "./lib/episodes.js";
import { reconcileEpisodeSequences } from "./lib/episode-sequences.js";

const CACHE_SECONDS = 900;
const MAX_GRAPH_NODES = 24;
const MAX_EPISODE_PAGES = 20;

export default async function handler(req, res) {
  setHeaders(res);
  if (req.method === "OPTIONS") return res.status(200).json({});
  const requestedId = getQuery(req, "id");
  const type = getQuery(req, "type") || "series";
  const malId = parseMalId(requestedId);
  if (type !== "series" || !malId) return res.status(404).json({ meta: null });

  try {
    const rootJikan = await getJikanAnime(malId);
    const rootAniList = await getAniListByMal(malId);
    if (!rootJikan && !rootAniList) return res.status(404).json({ meta: null });
    const root = rootJikan || aniListToJikan(rootAniList);
    const graph = await discoverTvGraph(malId, root, MAX_GRAPH_NODES);
    const seasons = numberSeasons(graph, malId);
    const videos = await buildVideos(seasons);
    const meta = buildMeta(root, requestedId, videos);
    if (getQuery(req, "debug") === "1") return res.status(200).json({ debug: debugPayload(graph, videos), meta });
    return res.status(200).json({ meta });
  } catch (error) {
    console.error("[meta-resolver-v5]", error);
    return res.status(502).json({ meta: null, error: "Upstream metadata resolution failed" });
  }
}

function setHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=3600`);
}
function getQuery(req, key) { try { const value = req.query?.[key]; if (Array.isArray(value)) return String(value[0] || ""); if (value != null) return String(value); } catch {} try { return new URL(req.url, "http://localhost").searchParams.get(key) || ""; } catch { return ""; } }
export function parseMalId(id) { const m = String(id || "").match(/^mal:(\d+)$/i) || String(id || "").match(/^(\d+)$/); return m ? Number(m[1]) : 0; }
function aniListToJikan(node) { return node ? { mal_id: Number(node.idMal), type: "TV", episodes: Number(node.episodes) || null, title: node.title?.romaji || node.title?.english || node.title?.native || `MAL ${node.idMal}`, title_english: node.title?.english || null, title_japanese: node.title?.native || null, title_synonyms: node.synonyms || [], aired: { from: partsDate(node.startDate), to: partsDate(node.endDate) }, year: Number(node.seasonYear) || null } : null; }
function partsDate(x) { return x?.year && x?.month && x?.day ? `${x.year}-${String(x.month).padStart(2,"0")}-${String(x.day).padStart(2,"0")}T00:00:00.000Z` : null; }

export function numberSeasons(entries, requestedMalId) {
  const requested = entries.find(x => Number(x.jikan?.mal_id) === Number(requestedMalId));
  const root = requested || entries.find(x => Number(x.jikan?.mal_id));
  const filtered = entries.filter(entry => {
    if (!root) return false;
    const malId = Number(entry.jikan?.mal_id);
    return malId === Number(requestedMalId) || isSeasonContinuation(root.node, entry.node);
  });

  const sorted = [...filtered].sort((a,b) => startTime(a) - startTime(b));
  const groups = [];
  for (const entry of sorted) {
    const explicit = explicitSeason(entry.node);
    const part = isPart(entry.node);
    let season = explicit || (part && groups.length ? groups[groups.length - 1].season : null);
    if (!season) season = nextSeasonNumber(groups);
    let group = groups.find(g => g.season === season);
    if (!group) { group = { season, entries: [] }; groups.push(group); }
    if (!group.entries.some(x => Number(x.jikan?.mal_id) === Number(entry.jikan?.mal_id))) group.entries.push(entry);
  }
  if (requested && !groups.some(g => g.entries.some(x => Number(x.jikan?.mal_id) === Number(requestedMalId)))) groups.unshift({ season: 1, entries: [requested] });
  return groups.sort((a,b) => a.season - b.season);
}

export function isSeasonContinuation(rootNode, candidateNode) {
  if (!candidateNode) return false;
  return Boolean(explicitSeason(candidateNode) || isPart(candidateNode));
}

function nextSeasonNumber(groups) { const max = groups.reduce((n, g) => Math.max(n, Number(g.season) || 0), 0); return max + 1; }
function explicitSeason(node) { const titles = [...(node?.synonyms || []), node?.title?.english, node?.title?.romaji, node?.title?.native].filter(Boolean).map(String); for (const t of titles) { const m = t.match(/\bseason\s*(\d+)\b/i) || t.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i) || t.match(/\bS(\d+)\b/i); if (m) return Number(m[1]); const r = t.match(/\b(II|III|IV|V)\b/i); if (r) return ({II:2,III:3,IV:4,V:5})[r[1].toUpperCase()]; } return null; }
function isPart(node) { const t = [...(node?.synonyms || []), node?.title?.english, node?.title?.romaji, node?.title?.native].filter(Boolean).join(" "); return /\b(?:part|cour)\s*[12]\b/i.test(t) || /第\s*[12]\s*クール/.test(t); }
function startTime(entry) { const d = entry.node?.startDate; return d?.year ? Date.UTC(d.year, (d.month || 1) - 1, d.day || 1) : Date.UTC(2100,0,1); }

async function buildVideos(groups) {
  const out = new Map();

  for (const group of groups) {
    const sequences = [];

    for (const entry of group.entries) {
      const malId = Number(entry.jikan?.mal_id);
      if (!malId) continue;

      const expected = Number(entry.jikan?.episodes) || 0;
      const ongoing = isOngoing(entry.jikan);
      const mapping = await getAniZipMapping(malId);
      const aniZipRows = mapping?.anilist_id
        ? mergeEpisodeRows(await getAniZipEpisodes(mapping.anilist_id, MAX_EPISODE_PAGES))
        : [];
      const jikanRows = (await getJikanEpisodes(malId, MAX_EPISODE_PAGES))
        .map(normalizeJikanEpisode)
        .filter(Boolean);

      const rows = chooseRows(jikanRows, aniZipRows, expected, ongoing);
      if (!rows.length) continue;

      const identity = /^tt\d+$/i.test(String(mapping?.imdb_id || ""))
        ? String(mapping.imdb_id)
        : `mal:${malId}`;

      sequences.push({ identity, rows });
    }

    const planned = reconcileEpisodeSequences(sequences);

    for (const row of planned) {
      const targetSeason =
        groups.length === 1 && Number(row.sourceSeason) > 0
          ? Number(row.sourceSeason)
          : group.season;

      const episode = Number(row.canonicalNumber);
      if (!Number.isInteger(targetSeason) || targetSeason <= 0 || !Number.isInteger(episode) || episode <= 0) continue;

      const identity = row.identity || "mal:unknown";
      const key = `${targetSeason}:${episode}`;
      const video = {
        id: `${identity}:${targetSeason}:${episode}`,
        title: row.title || `Episode ${episode}`,
        season: targetSeason,
        episode
      };

      if (row.released) video.released = row.released;
      if (row.thumbnail) video.thumbnail = row.thumbnail;

      const old = out.get(key);
      if (!old || better(video, old)) out.set(key, video);
    }
  }

  return [...out.values()].sort((a,b) => a.season - b.season || a.episode - b.episode);
}

function isOngoing(anime) {
  return Boolean(anime?.airing) || /currently\s+airing/i.test(String(anime?.status || "")) || !anime?.aired?.to;
}

export function chooseRows(jikanRows, aniZipRows, expected = 0, ongoing = false) {
  const jikan = Array.isArray(jikanRows) ? jikanRows : [];
  const aniZip = Array.isArray(aniZipRows) ? aniZipRows : [];

  // A complete Jikan sequence is preferred for finished/ordinary anime because
  // AniZip can contain provider-specific extras. For ongoing anime, however,
  // Jikan's episode count can represent only the currently published tranche
  // while AniZip may already contain a substantially longer canonical sequence.
  if (ongoing && aniZip.length > jikan.length) return enrichRows(aniZip, jikan);
  if (expected > 0 && jikan.length === expected) return enrichRows(jikan, aniZip);
  if (expected > 0 && aniZip.length >= expected && jikan.length < expected) return enrichRows(aniZip, jikan);
  if (aniZip.length > jikan.length) return enrichRows(aniZip, jikan);
  return enrichRows(jikan, aniZip);
}
function enrichRows(primary, secondary) {
  const enrich = new Map(secondary.map(x => [Number(x.number), x]));
  return primary.map((row) => {
    const e = enrich.get(row.number);
    if (!e) return row;
    const merged = { ...row };
    if (row.title === `Episode ${row.number}` && e.title) merged.title = e.title;
    if (!row.released && e.released) merged.released = e.released;
    if (!row.thumbnail && e.thumbnail) merged.thumbnail = e.thumbnail;
    if ((!row.sourceSeason || row.sourceSeason === 0) && e.sourceSeason) merged.sourceSeason = e.sourceSeason;
    return merged;
  });
}
function better(a,b) { return (/^Episode \d+$/i.test(b.title) && !/^Episode \d+$/i.test(a.title)) || (!b.thumbnail && a.thumbnail) || (!b.released && a.released); }

export function getReleaseInfo(root, videos) {
  const startYear = root?.aired?.from ? new Date(root.aired.from).getUTCFullYear() : (root?.year || null);
  const releasedYears = (Array.isArray(videos) ? videos : [])
    .map((video) => video?.released ? new Date(video.released).getUTCFullYear() : null)
    .filter((year) => Number.isInteger(year));
  const endYear = releasedYears.length ? Math.max(...releasedYears) : null;
  if (!startYear) return null;
  return `${startYear}${endYear && endYear >= startYear ? `-${endYear}` : "-"}`;
}

function buildMeta(root, requestedId, videos) {
  const meta = { id: requestedId, type: "series", name: root.title_english || root.title || root.title_japanese || requestedId, posterShape: "poster", videos };
  const poster = root.images?.jpg?.large_image_url || root.images?.jpg?.image_url;
  if (poster) { meta.poster = poster; meta.background = poster; }
  if (root.synopsis) meta.description = root.synopsis;
  if (Array.isArray(root.genres) && root.genres.length) meta.genres = root.genres.map(x => x.name).filter(Boolean);
  if (root.duration) meta.runtime = root.duration;
  if (root.aired?.from) meta.released = root.aired.from;
  meta.releaseInfo = getReleaseInfo(root, videos);
  if (!meta.releaseInfo) delete meta.releaseInfo;

  if (videos.length) meta.behaviorHints = { defaultVideoId: videos[0].id };
  return meta;
}
function debugPayload(graph, videos) { const seasons = {}; for (const v of videos) seasons[v.season] = (seasons[v.season] || 0) + 1; return { graph: graph.map(x => ({ malId: x.jikan?.mal_id, title: x.jikan?.title, episodes: x.jikan?.episodes || null })), totalEpisodes: videos.length, seasons, first: videos.slice(0,3), last: videos.slice(-3), uniqueIds: new Set(videos.map(v => v.id)).size }; }

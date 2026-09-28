import { getCached, setCached, requestJson } from "./http.js";

const ANILIST_URL = "https://graphql.anilist.co";
const JIKAN_URL = "https://api.jikan.moe/v4";
const ANIZIP_URL = "https://api.ani.zip/v1";
const ANILIST_FIELDS = `id idMal format status episodes season seasonYear title{romaji english native} synonyms startDate{year month day} endDate{year month day} relations{edges{relationType node{id idMal format status episodes season seasonYear title{romaji english native} synonyms startDate{year month day} endDate{year month day}}}}`;

export async function getAniListByMal(malId) {
  const key = `al:${malId}`; const cached = getCached(key); if (cached !== undefined) return cached;
  const query = `query($idMal:Int){Media(idMal:$idMal,type:ANIME){${ANILIST_FIELDS}}}`;
  try { const json = await requestJson(ANILIST_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables: { idMal: Number(malId) } }), retries: 2, cacheKey: key }); return setCached(key, json?.data?.Media || null); } catch { setCached(key, null); return null; }
}
export function aniListToJikan(node) { return node ? { mal_id: Number(node.idMal), type: "TV", episodes: Number(node.episodes) || null, title: node.title?.romaji || node.title?.english || node.title?.native || `MAL ${node.idMal}`, title_english: node.title?.english || null, title_japanese: node.title?.native || null, title_synonyms: Array.isArray(node.synonyms) ? node.synonyms : [], aired: { from: dateParts(node.startDate), to: dateParts(node.endDate) }, year: Number(node.seasonYear) || null } : null; }
function dateParts(x) { return x?.year && x?.month && x?.day ? `${String(x.year).padStart(4,"0")}-${String(x.month).padStart(2,"0")}-${String(x.day).padStart(2,"0")}T00:00:00.000Z` : null; }
export async function getJikanAnime(malId) { const key = `jk:a:${malId}`, cached = getCached(key); if (cached !== undefined) return cached; try { const json = await requestJson(`${JIKAN_URL}/anime/${malId}/full`, { retries: 2, cacheKey: key }); return setCached(key, json?.data || null); } catch { setCached(key, null); return null; } }
export async function getJikanEpisodes(malId, maxPages = 20) { const rows = []; for (let page = 1; page <= maxPages; page++) { try { const json = await requestJson(`${JIKAN_URL}/anime/${malId}/episodes?page=${page}`, { retries: 2, cacheKey: `jk:e:${malId}:${page}` }); const batch = Array.isArray(json?.data) ? json.data : []; rows.push(...batch); if (batch.length < 100) break; } catch { break; } } return rows; }
export async function getAniZipMapping(malId) { const key = `az:m:${malId}`, cached = getCached(key); if (cached !== undefined) return cached; try { const json = await requestJson(`${ANIZIP_URL}/mappings?mal_id=${encodeURIComponent(malId)}`, { retries: 2, cacheKey: key }); return setCached(key, json?.mappings || json || {}); } catch { setCached(key, null); return null; } }

export function extractAniZipEpisodeBatch(json) {
  if (Array.isArray(json?.episodes)) return json.episodes;
  if (json?.episodes && typeof json.episodes === "object") return Object.values(json.episodes);
  return [];
}

export async function getTvMazeEpisodes(imdbId) {
  const normalizedImdbId = String(imdbId || "").trim();
  if (!/^tt\\d+$/i.test(normalizedImdbId)) return [];

  const key = `tm:e:${normalizedImdbId}`;
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  try {
    const json = await requestJson(
      `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(normalizedImdbId)}&embed=episodes`,
      { retries: 2, cacheKey: key }
    );
    const episodes = Array.isArray(json?.episodes) ? json.episodes : [];
    const rows = episodes.map(normalizeTvMazeEpisode).filter(Boolean);
    return setCached(key, rows);
  } catch {
    setCached(key, []);
    return [];
  }
}

function normalizeTvMazeEpisode(item) {
  const number = Number(item?.number);
  if (!Number.isInteger(number) || number <= 0) return null;

  const sourceSeason = Number(item?.season) || 1;
  const title = String(item?.name || `Episode ${number}`).trim();
  const released = validEpisodeDate(item?.airdate, item?.airtime);
  if (!released || new Date(released).getTime() > Date.now()) return null;

  const absoluteEpisodeNumber = extractAbsoluteEpisodeNumber(title);

  return {
    number,
    sourceSeason,
    absoluteEpisodeNumber,
    title,
    released,
    thumbnail: item?.image?.original || item?.image?.medium || null
  };
}

function extractAbsoluteEpisodeNumber(title) {
  const match = String(title || "").match(/\\b(?:episode|ep\\.)\\s*#?\\s*(\\d+)\\b/i);
  return match ? Number(match[1]) : 0;
}

function validEpisodeDate(airdate, airtime) {
  if (!airdate) return null;
  const iso = airtime ? `${airdate}T${airtime}:00Z` : `${airdate}T00:00:00Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getAniZipEpisodes(anilistId) {
  const key = `az:e:${anilistId}`;
  const cached = getCached(key);
  if (cached !== undefined) return cached;
  try {
    // AniZip's episode endpoint returns the complete mapped episode collection.
    // Treating it as a paginated endpoint caused long-running anime to be
    // truncated to the first provider tranche (notably One Piece at 100).
    const json = await requestJson(`${ANIZIP_URL}/episodes?anilist_id=${encodeURIComponent(anilistId)}`, { retries: 2, cacheKey: key });
    return setCached(key, extractAniZipEpisodeBatch(json));
  } catch {
    setCached(key, []);
    return [];
  }
}

export async function discoverTvGraph(startMalId, rootJikan, maxNodes = 24) { const queue = [Number(startMalId)], seen = new Set(), result = new Map(); while (queue.length && result.size < maxNodes) { const malId = Number(queue.shift()); if (!malId || seen.has(malId)) continue; seen.add(malId); const [node, jikan] = await Promise.all([getAniListByMal(malId), malId === Number(startMalId) ? Promise.resolve(rootJikan) : getJikanAnime(malId)]); const tvNode = node && String(node.format).toUpperCase() === "TV" ? node : null; const tvJikan = jikan && String(jikan.type).toUpperCase() === "TV" ? jikan : (tvNode ? aniListToJikan(tvNode) : null); if (!tvNode && !tvJikan) continue; result.set(malId, { node: tvNode, jikan: tvJikan }); for (const edge of tvNode?.relations?.edges || []) { const rel = String(edge.relationType || "").toUpperCase(), child = edge.node, childMal = Number(child?.idMal || 0); if (["PREQUEL","SEQUEL"].includes(rel) && childMal && String(child?.format || "").toUpperCase() === "TV" && !seen.has(childMal)) queue.push(childMal); } for (const rel of jikan?.relations || []) { if (!/^(Sequel|Prequel)$/i.test(String(rel.relation || ""))) continue; for (const child of rel.entry || []) if (Number(child?.mal_id) && !seen.has(Number(child.mal_id))) queue.push(Number(child.mal_id)); } } return [...result.values()]; }

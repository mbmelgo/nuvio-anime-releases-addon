const ANILIST_URL = "https://graphql.anilist.co";
const cache = new Map();

export async function getAniListUpcomingByMal(malId, limit = 10) {
  const id = Number(malId);
  const perPage = Math.min(10, Math.max(1, Number(limit) || 10));
  if (!Number.isInteger(id) || id <= 0) return [];
  const key = `${id}:${perPage}`;
  if (cache.has(key)) return cache.get(key);
  const query = `query ($idMal: Int!, $perPage: Int!) {
    Media(idMal: $idMal, type: ANIME) {
      airingSchedule(notYetAired: true, perPage: $perPage) {
        nodes { episode airingAt }
      }
    }
  }`;
  try {
    const response = await fetch(ANILIST_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ query, variables: { idMal: id, perPage } })
    });
    if (!response.ok) return cache.set(key, []) || [];
    const payload = await response.json();
    const rows = (payload?.data?.Media?.airingSchedule?.nodes || [])
      .map(row => ({ episode: Number(row?.episode), airingAt: Number(row?.airingAt) }))
      .filter(row => Number.isInteger(row.episode) && row.episode > 0 && Number.isInteger(row.airingAt) && row.airingAt > Math.floor(Date.now() / 1000))
      .sort((a, b) => a.airingAt - b.airingAt || a.episode - b.episode);
    cache.set(key, rows);
    return rows;
  } catch (error) {
    console.error("[upcoming]", error);
    cache.set(key, []);
    return [];
  }
}

export function mergeUpcomingVideos(videos, upcoming, season, identity) {
  const result = Array.isArray(videos) ? videos.map(video => ({ ...video })) : [];
  const targetSeason = Number(season);
  if (!Number.isInteger(targetSeason) || targetSeason <= 0) return result;
  const prefix = String(identity || "mal:unknown");
  const existing = new Set(result
    .filter(video => Number(video?.season) === targetSeason)
    .map(video => Number(video?.episode))
    .filter(episode => Number.isInteger(episode) && episode > 0));
  for (const row of Array.isArray(upcoming) ? upcoming : []) {
    const episode = Number(row?.episode);
    if (!Number.isInteger(episode) || episode <= 0 || existing.has(episode)) continue;
    const airingAt = Number(row?.airingAt);
    if (!Number.isInteger(airingAt) || airingAt <= Math.floor(Date.now() / 1000)) continue;
    result.push({
      id: `${prefix}:${targetSeason}:${episode}`,
      title: `Episode ${episode}`,
      season: targetSeason,
      episode,
      released: new Date(airingAt * 1000).toISOString()
    });
    existing.add(episode);
  }
  return result.sort((a, b) => Number(a?.season || 0) - Number(b?.season || 0) || Number(a?.episode || 0) - Number(b?.episode || 0));
}

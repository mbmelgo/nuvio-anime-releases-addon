const SPECIAL_RE = /\b(?:recaps?|recap\s+episode|compilation|digest|summary|summaries|pre-broadcast|broadcast\s+special|tv\s+special|special\s+episode|opening|ending|preview|ova|ona|episode\s+of|fan\s+letter|barto['’]?s\s+secret\s+room)\b/i;

export function normalizeAniZipEpisode(item) {
  if (!item || typeof item !== "object") return null;
  const episode = Number(item.episodeNumber ?? item.number ?? item.episode);
  if (!Number.isInteger(episode) || episode <= 0) return null;
  const season = Number(item.seasonNumber ?? item.season ?? 1) || 1;
  const title = titleOf(item.title) || `Episode ${episode}`;
  if (isSpecial(item, title)) return null;
  return {
    number: episode,
    sourceSeason: season,
    absoluteEpisodeNumber: Number(item.absoluteEpisodeNumber ?? item.absoluteNumber ?? 0) || 0,
    title,
    released: validDate(item.airDateUtc ?? item.airDate ?? item.airdate),
    thumbnail: item.image || null
  };
}

export function normalizeJikanEpisode(item) {
  if (!item) return null;
  const number = Number(item.mal_id ?? item.number ?? item.episode);
  if (!Number.isInteger(number) || number <= 0) return null;
  const title = titleOf(item.title) || `Episode ${number}`;
  if (isSpecial(item, title)) return null;
  return {
    number,
    sourceSeason: 0,
    absoluteEpisodeNumber: 0,
    title,
    released: validDate(item.aired?.from),
    thumbnail: item.images?.jpg?.image_url || null
  };
}

export function mergeEpisodeRows(rows) {
  const map = new Map();
  for (const row of rows.map(normalizeAniZipEpisode).filter(Boolean)) {
    const key = `${row.sourceSeason}:${row.number}`;
    const old = map.get(key);
    if (!old || better(row, old)) map.set(key, row);
  }
  return [...map.values()].sort((a,b) => a.sourceSeason - b.sourceSeason || a.number - b.number);
}

export function titleOf(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") return String(value.english || value.en || value.romaji || value.japanese || value.ja || value.native || value.title || "").trim();
  return "";
}

function better(a,b) {
  return (!b.thumbnail && a.thumbnail) ||
    (!b.released && a.released) ||
    (/^Episode \d+$/i.test(b.title) && !/^Episode \d+$/i.test(a.title));
}

function isSpecial(item, title) {
  const type = String(item?.type || item?.episodeType || "").toLowerCase();
  if (/^(special|ova|ona|movie|recap|summary|compilation|digest)$/.test(type)) return true;

  // AniZip carries the AniDB episode code in `episode`. Regular TV episodes
  // are numeric; S/C/T/P/O prefixes represent specials/credits/trailers/
  // parodies/other entries and must not enter Nuvio's normal TV episode list.
  const aniDbEpisode = String(item?.episode || "").trim().toUpperCase();
  if (/^[SCTPO]\d+(?:\.\d+)?$/.test(aniDbEpisode)) return true;

  // TVDB specials are season 0. Do not let them become a normal Nuvio season.
  const season = Number(item?.seasonNumber ?? item?.season);
  if (Number.isInteger(season) && season === 0) return true;

  // Title matching is the final fallback only. Prefer explicit source metadata
  // above so legitimate episode titles containing words like "special" are not
  // discarded merely because of their wording.
  return SPECIAL_RE.test(title);
}

function validDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

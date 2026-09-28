const SPECIAL_RE = /\b(?:recaps?|recap\s+episode|compilation|digest|summary|summaries|pre-broadcast|broadcast\s+special|special\s+broadcast|tv\s+special|special\s+episode|opening|ending|preview|ova|ona|episode\s+of|fan\s+letter|barto['’]?s\s+secret\s+room)\b/i;

export function normalizeAniZipEpisode(item) {
  if (!item || typeof item !== "object") return null;
  const rawEpisode = item.episodeNumber ?? item.number ?? item.episode;
  const episode = Number(rawEpisode);
  if (!Number.isInteger(episode) || episode <= 0) return null;
  const season = Number(item.seasonNumber ?? item.season ?? 1) || 1;
  const title = titleOf(item.title) || `Episode ${episode}`;
  if (isSpecial(item, title)) return null;
  const released = validDate(item.airDateUtc ?? item.airDate ?? item.airdate);
  // A provider may publish placeholder rows such as "Episode 1181" before
  // an episode has a release date. Do not expose those as real episodes.
  if (!released && /^Episode\s+\d+$/i.test(title)) return null;
  // Do not expose episodes that have not aired yet. This is especially important
  // for ongoing anime where providers can publish scheduled episodes in advance.
  if (released && new Date(released).getTime() > Date.now()) return null;
  return {
    number: episode,
    sourceSeason: season,
    absoluteEpisodeNumber: Number(item.absoluteEpisodeNumber ?? item.absoluteNumber ?? 0) || 0,
    title,
    released,
    thumbnail: item.image || null
  };
}

export function normalizeJikanEpisode(item) {
  if (!item) return null;
  const number = Number(item.mal_id ?? item.number ?? item.episode);
  if (!Number.isInteger(number) || number <= 0) return null;
  const title = titleOf(item.title) || `Episode ${number}`;
  if (isSpecial(item, title)) return null;
  const released = validDate(item.aired?.from);
  if (released && new Date(released).getTime() > Date.now()) return null;
  return {
    number,
    sourceSeason: 0,
    absoluteEpisodeNumber: 0,
    title,
    released,
    thumbnail: item.images?.jpg?.image_url || null
  };
}

export function mergeEpisodeRows(rows) {
  const map = new Map();
  for (const item of rows) {
    const row = normalizeAniZipEpisode(item);
    if (!row) continue;
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

export function isSpecial(item, title = titleOf(item?.title)) {
  const type = String(item?.type || item?.episodeType || item?.kind || "").trim().toLowerCase();
  if (/^(special|ova|ona|movie|recap|summary|compilation|digest|opening|ending|preview|trailer|credits)$/.test(type)) return true;

  const aniDbEpisode = String(item?.episode || "").trim().toUpperCase();
  if (/^[SCTPO]\d+(?:\.\d+)?$/.test(aniDbEpisode)) return true;

  const season = Number(item?.seasonNumber ?? item?.season);
  if (Number.isInteger(season) && season === 0) return true;

  if (item?.isSpecial === true || item?.special === true || item?.is_ova === true || item?.is_ona === true) return true;

  return SPECIAL_RE.test(title);
}

function better(a,b) {
  return (!b.thumbnail && a.thumbnail) ||
    (!b.released && a.released) ||
    (/^Episode \d+$/i.test(b.title) && !/^Episode \d+$/i.test(a.title));
}

function validDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

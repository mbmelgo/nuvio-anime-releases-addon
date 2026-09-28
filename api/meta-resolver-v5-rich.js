import v5Handler from "./meta-resolver-v5.js";
import { getAniListByMal, getJikanAnime, discoverTvGraph } from "./lib/providers.js";
import { enrichMeta } from "./lib/rich-meta.js";

export default async function handler(req, res) {
  const captured = { statusCode: 200, headers: {}, body: null };
  const proxyRes = {
    setHeader(name, value) { captured.headers[name] = value; },
    status(code) { captured.statusCode = code; return this; },
    json(body) { captured.body = body; return this; },
  };

  await v5Handler(req, proxyRes);
  for (const [name, value] of Object.entries(captured.headers)) res.setHeader(name, value);

  if (!captured.body?.meta || captured.statusCode >= 400) {
    return res.status(captured.statusCode).json(captured.body || { meta: null });
  }

  const requestedId = queryValue(req, "id");
  const malId = parseMalId(requestedId);
  if (!malId) return res.status(captured.statusCode).json(captured.body);

  try {
    const root = await getJikanAnime(malId);
    const rootAniList = await getAniListByMal(malId);
    const graph = root ? await discoverTvGraph(malId, root, 24) : [];
    const seasonGroups = buildSeasonGroups(graph, malId);
    const meta = enrichMeta(captured.body.meta, root, rootAniList, seasonGroups);
    return res.status(captured.statusCode).json({ ...captured.body, meta });
  } catch (error) {
    console.error("[meta-resolver-v5-rich]", error);
    return res.status(captured.statusCode).json(captured.body);
  }
}

function queryValue(req, key) {
  try {
    const value = req.query?.[key];
    if (Array.isArray(value)) return String(value[0] || "");
    if (value != null) return String(value);
  } catch {}
  try { return new URL(req.url, "http://localhost").searchParams.get(key) || ""; } catch { return ""; }
}

function parseMalId(id) {
  const match = String(id || "").match(/^mal:(\d+)$/i) || String(id || "").match(/^(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function buildSeasonGroups(entries, requestedMalId) {
  const sorted = [...(entries || [])].sort((a, b) => startTime(a) - startTime(b));
  const groups = [];
  let nextSeason = 1;

  for (const entry of sorted) {
    const malId = Number(entry?.jikan?.mal_id || 0);
    if (!malId) continue;
    let season = malId === Number(requestedMalId) ? 1 : explicitSeason(entry);
    if (!season) {
      while (groups.some(group => group.season === nextSeason)) nextSeason += 1;
      season = nextSeason;
    }
    if (groups.some(group => group.season === season)) continue;
    groups.push({ season, entries: [entry] });
    nextSeason = Math.max(nextSeason, season + 1);
  }

  return groups.sort((a, b) => a.season - b.season);
}

function explicitSeason(entry) {
  const titles = [
    ...(Array.isArray(entry?.node?.synonyms) ? entry.node.synonyms : []),
    entry?.node?.title?.english,
    entry?.node?.title?.romaji,
    entry?.node?.title?.native,
    ...(Array.isArray(entry?.jikan?.title_synonyms) ? entry.jikan.title_synonyms : []),
    entry?.jikan?.title_english,
    entry?.jikan?.title,
    entry?.jikan?.title_japanese,
  ].filter(Boolean).map(String);

  for (const title of titles) {
    const numeric = title.match(/\bseason\s*(\d+)\b/i) || title.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i) || title.match(/\bS(\d+)\b/i);
    if (numeric) return Number(numeric[1]);
    const roman = title.match(/\b(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);
    if (roman) {
      const values = { II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
      return values[roman[1].toUpperCase()] || null;
    }
  }
  return null;
}

function startTime(entry) {
  const date = entry?.node?.startDate;
  return date?.year ? Date.UTC(date.year, (date.month || 1) - 1, date.day || 1) : Number.MAX_SAFE_INTEGER;
}

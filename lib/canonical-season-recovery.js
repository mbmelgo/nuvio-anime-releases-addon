import { TVDB_WEB_SEARCH_URL, FETCH_TIMEOUT_MS } from "./canonical-state.js";
import { normalizeTitle } from "./canonical-utils.js";

function stripContinuationMarkers(value) {
  return String(value || "")
    .replace(/第\s*[0-9０-９一二三四五六七八九十]+\s*期/gi, "")
    .replace(/\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b/gi, "")
    .replace(/\b(?:season|series|part|cour|act|arc)\s*(?:[0-9]+|[ivxlcdm]+)?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function baseTitle(value) {
  return normalizeTitle(stripContinuationMarkers(value)).replace(/\s+/g, "");
}

function hasContinuationMarker(titles) {
  return (Array.isArray(titles) ? titles : [titles]).some((value) => /(?:第\s*[0-9０-９一二三四五六七八九十]+\s*期|\b(?:season|series|part|cour|act|arc)\b|\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b)/i.test(String(value || "")));
}

function candidateId(hit) {
  const raw = String(hit?.id || hit?.objectID || hit?.tvdb_id || "");
  const match = raw.match(/(?:series-)?(\d+)$/i);
  return match?.[1] || null;
}

function candidateTitles(hit) {
  return [
    hit?.name,
    hit?.seriesName,
    hit?.title,
    ...(Array.isArray(hit?.aliases) ? hit.aliases : []),
    ...(Array.isArray(hit?.name_translated) ? hit.name_translated : []),
    ...(hit?.translations && typeof hit.translations === "object" ? Object.values(hit.translations) : []),
  ].filter(Boolean).map(baseTitle).filter(Boolean);
}

export async function recoverContinuingTvdbSeries(titles, fetchImpl = fetch) {
  if (!hasContinuationMarker(titles)) return { status: "not_applicable", tvdbId: null };
  const rawTitles = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const baseQueries = rawTitles.map(stripContinuationMarkers).filter(Boolean);
  const queries = [...new Set([...baseQueries, ...rawTitles, ...rawTitles.map(baseTitle)])].filter(Boolean).slice(0, 12);
  const sourceBase = rawTitles.map(baseTitle).filter(Boolean);
  for (const query of queries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImpl(TVDB_WEB_SEARCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ requests: [{ indexName: "TVDB", params: { query, maxValuesPerFacet: 20, page: 0, filters: "NOT is_official=0", facets: ["type", "year", "network", "status"], tagFilters: "" } }] }),
        signal: controller.signal,
      });
      if (!response.ok) continue;
      const json = await response.json().catch(() => ({}));
      const groups = Array.isArray(json?.results) ? json.results : Object.values(json?.results || {});
      const hits = groups.flatMap((group) => Array.isArray(group?.hits) ? group.hits : []);
      const candidate = hits.find((hit) => {
        const type = String(hit?.type || "").toLowerCase();
        return (type === "series" || /^series-\d+$/i.test(String(hit?.id || hit?.objectID || ""))) && candidateTitles(hit).some((title) => sourceBase.includes(title));
      });
      if (candidate) return { status: "found", tvdbId: candidateId(candidate) };
    } catch {
      return { status: "unknown", tvdbId: null };
    } finally {
      clearTimeout(timer);
    }
  }
  return { status: "not_found", tvdbId: null };
}

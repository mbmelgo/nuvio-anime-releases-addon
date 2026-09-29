import { TVDB_WEB_SEARCH_URL, FETCH_TIMEOUT_MS } from "./canonical-state.js";
import { normalizeTitle } from "./canonical-utils.js";

function titleVariants(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => normalizeTitle(value)).filter(Boolean))];
}

function continuationTitle(value) {
  return String(value || "")
    .replace(/第\s*[0-9０-９一二三四五六七八九十]+\s*期/gi, "")
    .replace(/\b(?:season|series|part|cour|act|arc)\s*(?:[0-9]+|[ivxlcdm]+)?\b/gi, "")
    .replace(/\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function continuationTitleVariants(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map(continuationTitle).map(normalizeTitle).filter(Boolean))];
}

function hasContinuationMarker(values) {
  return (Array.isArray(values) ? values : [values]).some((value) => /(?:第\s*[0-9０-９一二三四五六七八九十]+\s*期|\b(?:season|series|part|cour|act|arc)\b|\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b)/i.test(String(value || "")));
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
  ].filter(Boolean).map(normalizeTitle).filter(Boolean);
}

function candidateYear(hit) {
  const value = String(hit?.first_air_time || hit?.firstAired || hit?.first_air_date || "");
  const match = value.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

function candidateIsContinuing(hit) {
  return /continuing|airing|upcoming|returning/i.test(String(hit?.status || hit?.status_name || ""));
}

function titleMatchesContinuation(sourceTitles, hit) {
  const sourceBase = continuationTitleVariants(sourceTitles);
  const candidateBase = continuationTitleVariants(candidateTitles(hit));
  return sourceBase.some((title) => candidateBase.includes(title));
}

function isValidYear(sourceTitles, hit, expectedYear) {
  const year = candidateYear(hit);
  if (!expectedYear) return true;
  if (year === Number(expectedYear)) return true;
  return hasContinuationMarker(sourceTitles) && candidateIsContinuing(hit) && titleMatchesContinuation(sourceTitles, hit);
}

async function searchTvdb(titles, fetchImpl) {
  const variants = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean).slice(0, 6);
  const hits = [];
  let successfulResponse = false;
  for (const query of variants) {
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
      successfulResponse = true;
      const json = await response.json().catch(() => ({}));
      const groups = Array.isArray(json?.results) ? json.results : Object.values(json?.results || {});
      for (const group of groups) if (Array.isArray(group?.hits)) hits.push(...group.hits);
      if (hits.length) break;
    } finally {
      clearTimeout(timer);
    }
  }
  if (!successfulResponse) throw new Error("TVDB candidate search unavailable");
  return hits;
}

/**
 * Validate an existing TVDB series identity against the catalog anime.
 * A later season may legitimately share the TVDB series identity with an
 * earlier season, so an exact first-air-year match is not required when the
 * requested title explicitly identifies a continuation and TVDB marks the
 * candidate as continuing/airing/upcoming.
 */
export async function validateTvdbCandidate(titles, tvdbId, expectedYear, fetchImpl = fetch) {
  const sourceTitles = titleVariants(titles);
  if (!sourceTitles.length || !/^\d+$/.test(String(tvdbId || ""))) return { status: "rejected", tvdbId: null };
  let hits;
  try {
    hits = await searchTvdb(titles, fetchImpl);
  } catch {
    return { status: "unknown", tvdbId: String(tvdbId) };
  }
  const series = hits.filter((hit) => {
    const type = String(hit?.type || "").toLowerCase();
    return type === "series" || /^series-\d+$/i.test(String(hit?.id || hit?.objectID || ""));
  });
  const exactCurrent = series.find((hit) => candidateId(hit) === String(tvdbId) && sourceTitles.some((title) => candidateTitles(hit).includes(title)));
  if (exactCurrent && isValidYear(titles, exactCurrent, expectedYear)) return { status: "validated", tvdbId: String(tvdbId) };
  const replacement = series.find((hit) => sourceTitles.some((title) => candidateTitles(hit).includes(title)) && isValidYear(titles, hit, expectedYear));
  if (replacement) return { status: "replaced", tvdbId: candidateId(replacement) };
  return { status: "rejected", tvdbId: null };
}

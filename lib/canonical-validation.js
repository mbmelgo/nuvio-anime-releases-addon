import { TVDB_WEB_SEARCH_URL, FETCH_TIMEOUT_MS } from "./canonical-state.js";
import { normalizeTitle } from "./canonical-utils.js";

function titleVariants(values) {
  return [...new Set((Array.isArray(values) ? values : [values]).map((value) => normalizeTitle(value)).filter(Boolean))];
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

async function searchTvdb(titles, fetchImpl) {
  const variants = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean).slice(0, 6);
  const hits = [];
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
      const json = await response.json().catch(() => ({}));
      const groups = Array.isArray(json?.results) ? json.results : Object.values(json?.results || {});
      for (const group of groups) if (Array.isArray(group?.hits)) hits.push(...group.hits);
      if (hits.length) break;
    } finally {
      clearTimeout(timer);
    }
  }
  return hits;
}

/**
 * Validate an existing TVDB series identity against the catalog anime.
 * Returns a replacement when TVDB's search exposes a better same-title/year
 * series, rejects an incompatible candidate, and returns null when validation
 * could not be completed because the upstream search failed.
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
  if (exactCurrent && (!expectedYear || candidateYear(exactCurrent) === Number(expectedYear))) return { status: "validated", tvdbId: String(tvdbId) };
  const replacement = series.find((hit) => sourceTitles.some((title) => candidateTitles(hit).includes(title)) && (!expectedYear || candidateYear(hit) === Number(expectedYear)));
  if (replacement) return { status: "replaced", tvdbId: candidateId(replacement) };
  return { status: "rejected", tvdbId: null };
}

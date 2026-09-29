import { TVDB_WEB_SEARCH_URL, TVDB_SERIES_URL, TVDB_READER_URL, FETCH_TIMEOUT_MS } from "./canonical-state.js";
import { normalizeTitle } from "./canonical-utils.js";

function titleVariants(values) { return [...new Set((Array.isArray(values) ? values : [values]).map((value) => normalizeTitle(value)).filter(Boolean))]; }
function continuationTitle(value) { return String(value || "").replace(/第\s*[0-9０-９一二三四五六七八九十]+\s*期/gi, "").replace(/\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b/gi, "").replace(/\b(?:season|series|part|cour|act|arc)\s*(?:[0-9]+|[ivxlcdm]+)\b/gi, "").replace(/\s+/g, " ").trim(); }
function continuationTitleVariants(values) { return [...new Set((Array.isArray(values) ? values : [values]).map(continuationTitle).map(normalizeTitle).filter(Boolean))]; }
function hasContinuationMarker(values) { return (Array.isArray(values) ? values : [values]).some((value) => /(?:第\s*[0-9０-９一二三四五六七八九十]+\s*期|\b(?:[0-9]+(?:st|nd|rd|th)|[ivxlcdm]+)\s+(?:season|series|part|cour|act|arc)\b|\b(?:season|series|part|cour|act|arc)\s*(?:[0-9]+|[ivxlcdm]+)\b)/i.test(String(value || ""))); }
function candidateId(hit) { const raw = String(hit?.id || hit?.objectID || hit?.tvdb_id || ""); const match = raw.match(/(?:series-)?(\d+)$/i); return match?.[1] || null; }
function candidatePrimaryTitles(hit) { return [hit?.name, hit?.seriesName, hit?.title].filter(Boolean).map(normalizeTitle).filter(Boolean); }
function candidateTitles(hit) { return [hit?.name, hit?.seriesName, hit?.title, ...(Array.isArray(hit?.aliases) ? hit.aliases : []), ...(Array.isArray(hit?.name_translated) ? hit.name_translated : []), ...(hit?.translations && typeof hit.translations === "object" ? Object.values(hit.translations) : [])].filter(Boolean).map(normalizeTitle).filter(Boolean); }
function candidateYear(hit) { const value = String(hit?.first_air_time || hit?.firstAired || hit?.first_air_date || ""); const match = value.match(/^(\d{4})/); return match ? Number(match[1]) : null; }
function candidateIsContinuing(hit) { return /continuing|airing|upcoming|returning/i.test(String(hit?.status || hit?.status_name || "")); }
function titleMatchesContinuation(sourceTitles, hit) { const sourceBase = continuationTitleVariants(sourceTitles); const candidateBase = continuationTitleVariants(candidateTitles(hit)); return sourceBase.some((title) => candidateBase.includes(title)); }
function isValidYear(sourceTitles, hit, expectedYear) { const year = candidateYear(hit); if (!expectedYear) return true; if (year === Number(expectedYear)) return true; const primaryMatch = candidatePrimaryTitles(hit).some((title) => titleVariants(sourceTitles).includes(title)); if (primaryMatch && candidateIsContinuing(hit)) return true; return hasContinuationMarker(sourceTitles) && candidateIsContinuing(hit) && titleMatchesContinuation(sourceTitles, hit); }

async function searchTvdb(titles, fetchImpl) {
  const rawVariants = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const variants = [...new Set([...rawVariants, ...rawVariants.map(continuationTitle)])].filter(Boolean).slice(0, 10);
  const hits = []; let successfulResponse = false;
  for (const query of variants) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetchImpl(TVDB_WEB_SEARCH_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "Mozilla/5.0" }, body: JSON.stringify({ requests: [{ indexName: "TVDB", params: { query, maxValuesPerFacet: 20, page: 0, filters: "NOT is_official=0", facets: ["type", "year", "network", "status"], tagFilters: "" } }] }), signal: controller.signal });
      if (!response.ok) continue;
      successfulResponse = true; const json = await response.json().catch(() => ({})); const groups = Array.isArray(json?.results) ? json.results : Object.values(json?.results || {});
      for (const group of groups) if (Array.isArray(group?.hits)) hits.push(...group.hits);
    } finally { clearTimeout(timer); }
  }
  if (!successfulResponse) throw new Error("TVDB candidate search unavailable");
  const seen = new Set(); return hits.filter((hit) => { const id = candidateId(hit); if (!id || seen.has(id)) return false; seen.add(id); return true; });
}
function seriesHits(hits) { return hits.filter((hit) => { const type = String(hit?.type || "").toLowerCase(); return type === "series" || /^series-\d+$/i.test(String(hit?.id || hit?.objectID || "")); }); }
function candidateMatchesSource(titles, hit) { const exact = titleVariants(titles).some((title) => candidateTitles(hit).includes(title)); return exact || (hasContinuationMarker(titles) && titleMatchesContinuation(titles, hit)); }

async function exactPageFallback(titles, fetchImpl) {
  const rawTitles = [...new Set((Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean))].slice(0, 6);
  for (const title of rawTitles) {
    const slug = normalizeTitle(title).replace(/\s+/g, "-"); if (!slug) continue;
    for (const baseUrl of [TVDB_SERIES_URL, TVDB_READER_URL]) {
      try {
        const response = await fetchImpl(`${baseUrl}${encodeURIComponent(slug)}`, { headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0" } });
        if (!response.ok) continue;
        const html = await response.text(); const match = html.match(/TheTVDB\.com Series ID\s*:?\s*(\d+)/i) || html.match(/series\/(\d+)/i);
        if (match?.[1]) return String(match[1]);
      } catch {}
    }
  }
  return null;
}

export async function findValidatedTvdbCandidate(titles, expectedYear, fetchImpl = fetch) {
  const sourceTitles = titleVariants(titles); if (!sourceTitles.length) return { status: "rejected", tvdbId: null };
  let hits; try { hits = await searchTvdb(titles, fetchImpl); } catch { return { status: "unknown", tvdbId: null }; }
  const series = seriesHits(hits);
  const exact = series.find((hit) => sourceTitles.some((title) => candidatePrimaryTitles(hit).includes(title)) && isValidYear(titles, hit, expectedYear));
  if (exact) return { status: "found", tvdbId: candidateId(exact) };
  const continuation = series.find((hit) => hasContinuationMarker(titles) && isValidYear(titles, hit, expectedYear));
  if (continuation) return { status: "found", tvdbId: candidateId(continuation) };
  const pageFallback = await exactPageFallback(titles, fetchImpl); if (pageFallback) return { status: "found", tvdbId: pageFallback };
  return { status: "rejected", tvdbId: null };
}

export async function validateTvdbCandidate(titles, tvdbId, expectedYear, fetchImpl = fetch) {
  const sourceTitles = titleVariants(titles); if (!sourceTitles.length || !/^\d+$/.test(String(tvdbId || ""))) return { status: "rejected", tvdbId: null };
  let hits; try { hits = await searchTvdb(titles, fetchImpl); } catch { return { status: "unknown", tvdbId: String(tvdbId) }; }
  const series = seriesHits(hits);
  const exactCurrent = series.find((hit) => candidateId(hit) === String(tvdbId) && candidateMatchesSource(titles, hit) && isValidYear(titles, hit, expectedYear));
  if (exactCurrent) return { status: "validated", tvdbId: String(tvdbId) };
  const replacement = series.find((hit) => candidateMatchesSource(titles, hit) && isValidYear(titles, hit, expectedYear));
  if (replacement) return { status: "replaced", tvdbId: candidateId(replacement) };
  const pageFallback = await exactPageFallback(titles, fetchImpl); if (pageFallback && pageFallback !== String(tvdbId)) return { status: "replaced", tvdbId: pageFallback };
  return { status: "rejected", tvdbId: null };
}

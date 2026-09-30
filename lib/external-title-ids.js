import { WIKIDATA_SPARQL_URL } from "./canonical-state.js";
import { normalizeTitle, escapeSparqlString } from "./canonical-utils.js";

function seasonBaseTitle(title) {
  let value = String(title || "").trim();
  if (!value) return "";
  value = value.replace(/\s*\(\d{4}\)\s*$/u, "").trim();
  value = value.replace(/\s+(?:season|series|part|cour)\s+(?:\d+|[ivxlcdm]+)\s*$/iu, "").trim();
  value = value.replace(/\s+\d+(?:st|nd|rd|th)\s+(?:season|series|part|cour)\s*$/iu, "").trim();
  value = value.replace(/\s+[ivxlcdm]{1,4}\s*$/iu, "").trim();
  return value;
}

export function expandTitleVariants(titles) {
  const raw = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const variants = [];
  for (const title of raw) {
    const base = seasonBaseTitle(title);
    for (const value of [title, base, normalizeTitle(title), normalizeTitle(base)]) {
      if (value && !variants.includes(value)) variants.push(value);
    }
  }
  return variants.slice(0, 16);
}

export function selectExternalMetadataIds(bindings, expectedTitles = []) {
  const rows = Array.isArray(bindings) ? bindings : [];
  const expected = Array.isArray(expectedTitles) ? expectedTitles : [expectedTitles];
  const wanted = new Set(expandTitleVariants(expected).map(normalizeTitle).filter(Boolean));
  if (!wanted.size) return { tmdb: null, imdb: null };
  const candidates = rows.filter((row) => wanted.has(normalizeTitle(row?.label?.value || "")));
  if (!candidates.length) return { tmdb: null, imdb: null };
  const itemIds = [...new Set(candidates.map((row) => String(row?.item?.value || "")).filter(Boolean))];
  if (itemIds.length !== 1) return { tmdb: null, imdb: null };
  const row = candidates.find((candidate) => String(candidate?.item?.value || "") === itemIds[0]);
  const tvdb = String(row?.tvdb?.value || "");
  const tmdb = String(row?.tmdb?.value || "");
  const imdb = String(row?.imdb?.value || "");
  const result = {};
  if (/^\d+$/.test(tvdb)) result.tvdb = tvdb;
  if (/^\d+$/.test(tmdb)) result.tmdb = tmdb;
  if (/^tt\d+$/i.test(imdb)) result.imdb = imdb;
  if (result.tmdb || result.imdb || result.tvdb) return {
    tmdb: result.tmdb || null,
    imdb: result.imdb || null,
    ...(result.tvdb ? { tvdb: result.tvdb } : {}),
  };
  return { tmdb: null, imdb: null };
}

async function fetchWikidata(query, fetchImpl) {
  const target = new URL(WIKIDATA_SPARQL_URL);
  target.searchParams.set("query", query);
  target.searchParams.set("format", "json");
  const response = await fetchImpl(target, { headers: { Accept: "application/sparql-results+json" } });
  if (response && response.ok === false) return [];
  const data = typeof response?.json === "function" ? await response.json().catch(() => ({})) : response;
  return Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
}

export async function resolveExternalMetadataIdsByAniListId(anilistId, titles = [], fetchImpl = fetch) {
  const id = String(anilistId || "").trim();
  if (!/^\d+$/.test(id)) return { tmdb: null, imdb: null };
  try {
    const query = `SELECT ?item ?label ?tvdb ?tmdb ?imdb WHERE { ?item wdt:P8729 "${escapeSparqlString(id)}" . ?item rdfs:label ?label . FILTER(LANG(?label) = "en") OPTIONAL { ?item wdt:P4835 ?tvdb } OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tvdb) || BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 30`;
    return selectExternalMetadataIds(await fetchWikidata(query, fetchImpl), titles);
  } catch {
    return { tmdb: null, imdb: null };
  }
}

export async function resolveExternalMetadataIdsByAniListIds(anilistIds, metas = [], fetchImpl = fetch) {
  const ids = [...new Set((Array.isArray(anilistIds) ? anilistIds : [anilistIds]).map((id) => String(id || "").trim()).filter((id) => /^\d+$/.test(id)))];
  const result = new Map();
  if (!ids.length) return result;

  try {
    const anilistValues = ids.map((id) => `"${escapeSparqlString(id)}"`).join(" ");
    const malToAnilist = new Map();
    for (const meta of Array.isArray(metas) ? metas : []) {
      const anilistId = String(meta?.extra?.anilistId || "").trim();
      const malId = String(meta?.extra?.malId || "").trim();
      if (/^\d+$/.test(anilistId) && /^\d+$/.test(malId)) malToAnilist.set(malId, anilistId);
    }
    const malIds = [...malToAnilist.keys()];
    const malValues = malIds.map((id) => `"${escapeSparqlString(id)}"`).join(" ");
    const query = `SELECT ?anilist ?mal ?item ?label ?tvdb ?tmdb ?imdb WHERE { { ?item wdt:P8729 ?anilist . VALUES ?anilist { ${anilistValues} } } ${malIds.length ? `UNION { ?item wdt:P4082 ?mal . VALUES ?mal { ${malValues} } }` : ""} ?item rdfs:label ?label . FILTER(LANG(?label) = "en") OPTIONAL { ?item wdt:P4835 ?tvdb } OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tvdb) || BOUND(?tmdb) || BOUND(?imdb)) }`;
    const rows = await fetchWikidata(query, fetchImpl);

    for (const id of ids) {
      const index = ids.indexOf(id);
      const meta = metas[index];
      const titles = [meta?.name, meta?.extra?.titleEnglish, meta?.extra?.titleRomaji, meta?.extra?.titleNative].filter(Boolean);
      const candidates = rows.filter((row) => {
        const rowAniList = String(row?.anilist?.value || "");
        const rowMal = String(row?.mal?.value || "");
        return rowAniList === id || (rowMal && malToAnilist.get(rowMal) === id);
      });
      const mapping = selectExternalMetadataIds(candidates, titles);
      if (mapping.tmdb || mapping.imdb || mapping.tvdb) result.set(id, mapping);
    }
  } catch {}

  return result;
}

export async function resolveExternalMetadataIdsByTitle(titles, fetchImpl = fetch) {
  const variants = expandTitleVariants(titles);
  for (const title of variants) {
    try {
      const query = `SELECT ?item ?label ?tvdb ?tmdb ?imdb WHERE { ?item rdfs:label ?label . FILTER(LCASE(STR(?label)) = "${escapeSparqlString(title.toLowerCase())}") OPTIONAL { ?item wdt:P4835 ?tvdb } OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tvdb) || BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 10`;
      const result = selectExternalMetadataIds(await fetchWikidata(query, fetchImpl), [title]);
      if (result.tmdb || result.imdb || result.tvdb) return result;
    } catch {}
  }
  return { tmdb: null, imdb: null };
}

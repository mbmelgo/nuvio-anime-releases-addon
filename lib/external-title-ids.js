import { WIKIDATA_SPARQL_URL } from "./canonical-state.js";
import { normalizeTitle, escapeSparqlString } from "./canonical-utils.js";

export function selectExternalMetadataIds(bindings, expectedTitles = []) {
  const rows = Array.isArray(bindings) ? bindings : [];
  const wanted = new Set((Array.isArray(expectedTitles) ? expectedTitles : [expectedTitles]).map(normalizeTitle).filter(Boolean));
  const candidates = wanted.size ? rows.filter((row) => wanted.has(normalizeTitle(row?.label?.value || ""))) : rows;
  const source = candidates.length ? candidates : rows;
  const itemIds = [...new Set(source.map((row) => String(row?.item?.value || "")).filter(Boolean))];
  if (itemIds.length !== 1) return { tmdb: null, imdb: null };
  const row = source.find((candidate) => String(candidate?.item?.value || "") === itemIds[0]);
  const tmdb = String(row?.tmdb?.value || "");
  const imdb = String(row?.imdb?.value || "");
  if (/^\d+$/.test(tmdb)) return { tmdb, imdb: /^tt\d+$/i.test(imdb) ? imdb : null };
  if (/^tt\d+$/i.test(imdb)) return { tmdb: null, imdb };
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
    const query = `SELECT ?item ?label ?tmdb ?imdb WHERE { ?item wdt:P8729 "${escapeSparqlString(id)}" . ?item rdfs:label ?label . FILTER(LANG(?label) = "en") OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 30`;
    return selectExternalMetadataIds(await fetchWikidata(query, fetchImpl), titles);
  } catch {
    return { tmdb: null, imdb: null };
  }
}

export async function resolveExternalMetadataIdsByTitle(titles, fetchImpl = fetch) {
  const raw = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const variants = [...new Set([...raw, ...raw.map(normalizeTitle).filter(Boolean)])].slice(0, 8);
  for (const title of variants) {
    try {
      const query = `SELECT ?item ?label ?tmdb ?imdb WHERE { ?item rdfs:label ?label . FILTER(LCASE(STR(?label)) = "${escapeSparqlString(title.toLowerCase())}") OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 10`;
      const result = selectExternalMetadataIds(await fetchWikidata(query, fetchImpl), [title]);
      if (result.tmdb || result.imdb) return result;
    } catch {}
  }
  return { tmdb: null, imdb: null };
}

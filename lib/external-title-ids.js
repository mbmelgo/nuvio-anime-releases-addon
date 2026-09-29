import { WIKIDATA_SPARQL_URL } from "./canonical-state.js";
import { normalizeTitle, escapeSparqlString } from "./canonical-utils.js";

export function selectExternalMetadataIds(bindings) {
  const rows = Array.isArray(bindings) ? bindings : [];
  const itemIds = [...new Set(rows.map((row) => String(row?.item?.value || "")).filter(Boolean))];
  if (itemIds.length !== 1) return { tmdb: null, imdb: null };
  const row = rows.find((candidate) => String(candidate?.item?.value || "") === itemIds[0]);
  const tmdb = String(row?.tmdb?.value || "");
  const imdb = String(row?.imdb?.value || "");
  if (/^\d+$/.test(tmdb)) return { tmdb, imdb: /^tt\d+$/i.test(imdb) ? imdb : null };
  if (/^tt\d+$/i.test(imdb)) return { tmdb: null, imdb };
  return { tmdb: null, imdb: null };
}

export async function resolveExternalMetadataIdsByTitle(titles, fetchImpl = fetch) {
  const raw = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const variants = [...new Set([...raw, ...raw.map(normalizeTitle).filter(Boolean)])].slice(0, 8);
  for (const title of variants) {
    try {
      const query = `SELECT ?item ?tmdb ?imdb WHERE { ?item rdfs:label ?label . FILTER(LCASE(STR(?label)) = "${escapeSparqlString(title.toLowerCase())}") OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 10`;
      const target = new URL(WIKIDATA_SPARQL_URL);
      target.searchParams.set("query", query);
      target.searchParams.set("format", "json");
      const response = await fetchImpl(target, { headers: { Accept: "application/sparql-results+json" } });
      if (response && response.ok === false) continue;
      const data = typeof response?.json === "function" ? await response.json().catch(() => ({})) : response;
      const result = selectExternalMetadataIds(data?.results?.bindings);
      if (result.tmdb || result.imdb) return result;
    } catch {}
  }
  return { tmdb: null, imdb: null };
}

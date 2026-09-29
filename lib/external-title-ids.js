import { WIKIDATA_SPARQL_URL } from "./canonical-state.js";
import { getJson } from "./canonical-http.js";
import { normalizeTitle, escapeSparqlString } from "./canonical-utils.js";

export async function resolveExternalMetadataIdsByTitle(titles, fetchImpl = fetch) {
  const raw = (Array.isArray(titles) ? titles : [titles]).map((value) => String(value || "").trim()).filter(Boolean);
  const variants = [...new Set([...raw, ...raw.map(normalizeTitle).filter(Boolean)])].slice(0, 8);
  for (const title of variants) {
    try {
      const query = `SELECT ?item ?tmdb ?imdb WHERE { ?item rdfs:label ?label . FILTER(LCASE(STR(?label)) = "${escapeSparqlString(title.toLowerCase())}") OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P345 ?imdb } FILTER(BOUND(?tmdb) || BOUND(?imdb)) } LIMIT 10`;
      const data = await getJson(fetchImpl, WIKIDATA_SPARQL_URL, { query, format: "json" }, { headers: { Accept: "application/sparql-results+json" } });
      const rows = Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
      const itemIds = [...new Set(rows.map((row) => String(row?.item?.value || "")).filter(Boolean))];
      if (itemIds.length !== 1) continue;
      const row = rows.find((candidate) => String(candidate?.item?.value || "") === itemIds[0]);
      const tmdb = String(row?.tmdb?.value || "");
      const imdb = String(row?.imdb?.value || "");
      if (/^\d+$/.test(tmdb)) return { tmdb, imdb: /^tt\d+$/i.test(imdb) ? imdb : null };
      if (/^tt\d+$/i.test(imdb)) return { tmdb: null, imdb };
    } catch {}
  }
  return { tmdb: null, imdb: null };
}

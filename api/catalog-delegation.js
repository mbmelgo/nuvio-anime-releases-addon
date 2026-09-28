import stremioHandler from "./catalog-source.js";

const ANILIST_URL = "https://graphql.anilist.co";
const ANIZIP_URL = "https://api.ani.zip/v1/mappings";
const WIKIDATA_URL = "https://query.wikidata.org/sparql";
const FETCH_TIMEOUT_MS = 8000;
const ANIZIP_CONCURRENCY = 6;

export default async function handler(req, res) {
  const captured = { statusCode: 200, headers: {}, body: null };
  const proxyRes = {
    status(code) { captured.statusCode = code; return proxyRes; },
    setHeader(name, value) { captured.headers[name] = value; },
    json(body) { captured.body = body; return body; },
  };

  await stremioHandler(req, proxyRes);

  if (!captured.body?.metas) return sendCaptured(res, captured);

  try {
    captured.body.metas = await delegateCompatibleIds(captured.body.metas);
  } catch (error) {
    console.warn("[catalog-delegation] ID mapping failed:", error.message);
  }

  return sendCaptured(res, captured);
}

function sendCaptured(res, captured) {
  for (const [name, value] of Object.entries(captured.headers)) res.setHeader(name, value);
  return res.status(captured.statusCode).json(captured.body);
}

export async function delegateCompatibleIds(metas) {
  const rows = Array.isArray(metas) ? metas : [];
  const malIds = rows.map((meta) => parseId(meta?.id, "mal")).filter(Boolean);
  const anilistIds = rows.map((meta) => parseId(meta?.id, "anilist")).filter(Boolean);
  if (!malIds.length && !anilistIds.length) return rows;

  const [malMedia, anilistMedia] = await Promise.all([
    malIds.length ? queryMedia({ idMal_in: malIds }) : Promise.resolve([]),
    anilistIds.length ? queryMedia({ id_in: anilistIds }) : Promise.resolve([]),
  ]);

  const byKey = new Map();
  for (const item of [...malMedia, ...anilistMedia]) {
    if (item.idMal) byKey.set(`mal:${item.idMal}`, item);
    if (item.id) byKey.set(`anilist:${item.id}`, item);
  }

  const unresolved = rows.filter((meta) => !extractCompatibleId(byKey.get(String(meta?.id || ""))?.externalLinks));
  const relationMappings = await queryRelatedMappings(unresolved, byKey);
  const afterRelations = unresolved.filter((meta) => !relationMappings.has(String(meta?.id || "")));
  const anizip = await queryAniZipMappings(afterRelations);
  const afterAniZip = afterRelations.filter((meta) => !anizip.has(String(meta?.id || "")));
  const wikidata = await queryWikidataMappings(afterAniZip, byKey);

  return rows.map((meta) => {
    const sourceId = String(meta?.id || "");
    const direct = extractCompatibleId(byKey.get(sourceId)?.externalLinks);
    const related = relationMappings.get(sourceId);
    const mapped = direct || related || anizip.get(sourceId) || wikidata.get(sourceId);
    return mapped ? { ...meta, id: mapped } : meta;
  });
}

async function queryMedia(filter) {
  const variableName = Object.keys(filter)[0];
  const query = `query ($ids:[Int]) { Page(perPage:50) { media(type:ANIME,${variableName}:$ids) { id idMal title { romaji english native } synonyms externalLinks { site url } relations { edges { relationType node { id idMal title { romaji english native } externalLinks { site url } } } } } } }`;
  const payload = await fetchJson(ANILIST_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables: { ids: Object.values(filter)[0] } }),
  });
  return payload?.data?.Page?.media || [];
}

async function queryRelatedMappings(metas, byKey) {
  const result = new Map();
  const relationCandidates = [];
  const candidateSources = new Map();

  for (const meta of metas) {
    const sourceId = String(meta?.id || "");
    const media = byKey.get(sourceId);
    const edges = Array.isArray(media?.relations?.edges) ? media.relations.edges : [];
    const ordered = [...edges].sort((a, b) => relationPriority(a?.relationType) - relationPriority(b?.relationType));

    for (const edge of ordered) {
      const compatible = extractCompatibleId(edge?.node?.externalLinks);
      if (compatible) {
        result.set(sourceId, compatible);
        break;
      }

      const node = edge?.node;
      if (!node?.id && !node?.idMal) continue;
      const candidateId = node.idMal ? `mal:${node.idMal}` : `anilist:${node.id}`;
      if (!candidateSources.has(candidateId)) candidateSources.set(candidateId, []);
      candidateSources.get(candidateId).push(sourceId);
      relationCandidates.push({ id: candidateId, type: "series", name: node.title?.english || node.title?.romaji || node.title?.native || "" });
      break;
    }
  }

  if (!relationCandidates.length) return result;
  const relatedMappings = await queryAniZipMappings(relationCandidates);
  for (const [candidateId, compatible] of relatedMappings) {
    for (const sourceId of candidateSources.get(candidateId) || []) result.set(sourceId, compatible);
  }
  return result;
}

function relationPriority(type) {
  const priorities = { PREQUEL: 0, SEQUEL: 1, SIDE_STORY: 2, ALTERNATIVE: 3, PARENT: 4 };
  return priorities[String(type || "").toUpperCase()] ?? 10;
}

async function queryAniZipMappings(metas) {
  const result = new Map();
  const jobs = metas.map((meta) => async () => {
    const sourceId = String(meta?.id || "");
    const malId = parseId(sourceId, "mal");
    const anilistId = parseId(sourceId, "anilist");
    if (!malId && !anilistId) return;

    const queryKey = malId ? `mal_id=${malId}` : `anilist_id=${anilistId}`;
    try {
      const payload = await fetchJson(`${ANIZIP_URL}?${queryKey}`, {
        headers: { accept: "application/json" },
      });
      const mapping = payload?.mappings || payload;
      const compatible = extractAniZipCompatibleId(mapping);
      if (compatible) result.set(sourceId, compatible);
    } catch (error) {
      console.warn(`[catalog-delegation] AniZip lookup failed for ${sourceId}:`, error.message);
    }
  });

  await runWithConcurrency(jobs, ANIZIP_CONCURRENCY);
  return result;
}

function extractAniZipCompatibleId(mapping) {
  const imdb = String(mapping?.imdb_id || "").trim();
  if (/^tt\d+$/i.test(imdb)) return imdb.toLowerCase();

  const tmdb = String(mapping?.themoviedb_id || "").trim();
  if (tmdb) return `tmdb:${tmdb.replace(/^tv:/i, "")}`;

  const tvdb = String(mapping?.thetvdb_id || "").trim();
  if (/^\d+$/.test(tvdb)) return `tvdb:${tvdb}`;
  return null;
}

async function runWithConcurrency(jobs, limit) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, jobs.length) }, async () => {
    while (index < jobs.length) {
      const current = index++;
      await jobs[current]();
    }
  });
  await Promise.all(workers);
}

async function queryWikidataMappings(metas, byKey) {
  const malIds = [];
  const anilistIds = [];
  const names = [];
  const sourceIdsByName = new Map();

  for (const meta of metas) {
    const id = String(meta?.id || "");
    const mal = parseId(id, "mal");
    const anilist = parseId(id, "anilist");
    if (mal) malIds.push(String(mal));
    if (anilist) anilistIds.push(String(anilist));

    const media = byKey.get(id);
    for (const name of originalNameCandidates(media)) {
      names.push(name);
      if (!sourceIdsByName.has(name.toLowerCase())) sourceIdsByName.set(name.toLowerCase(), []);
      sourceIdsByName.get(name.toLowerCase()).push(id);
    }

    const edges = Array.isArray(media?.relations?.edges) ? media.relations.edges : [];
    for (const edge of edges) {
      for (const name of originalNameCandidates(edge?.node)) {
        names.push(name);
        if (!sourceIdsByName.has(name.toLowerCase())) sourceIdsByName.set(name.toLowerCase(), []);
        sourceIdsByName.get(name.toLowerCase()).push(id);
      }
    }
  }
  if (!malIds.length && !anilistIds.length && !names.length) return new Map();

  const values = [
    malIds.length ? `{ VALUES ?mal { ${malIds.map((id) => `"${id}"`).join(" ")} } ?item wdt:P4086 ?mal . }` : "",
    anilistIds.length ? `{ VALUES ?anilist { ${anilistIds.map((id) => `"${id}"`).join(" ")} } ?item wdt:P8729 ?anilist . }` : "",
  ].filter(Boolean).join(" UNION ");

  const nameValues = names.length
    ? `VALUES ?label { ${[...new Set(names)].map((name) => `"${escapeSparqlString(name)}"`).join(" ")} } ?item rdfs:label ?label . FILTER(LANG(?label) = "en" || LANG(?label) = "")`
    : "";
  const nameBranch = nameValues ? `{ ${nameValues} }` : "";
  const branches = [values, nameBranch].filter(Boolean).join(" UNION ");

  const query = `SELECT ?item ?mal ?anilist ?label ?imdb ?tmdb ?tvdb WHERE { { ${branches} } OPTIONAL { ?item wdt:P4086 ?mal } OPTIONAL { ?item wdt:P8729 ?anilist } OPTIONAL { ?item rdfs:label ?label } OPTIONAL { ?item wdt:P345 ?imdb } OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P4835 ?tvdb } } LIMIT 500`;
  const payload = await fetchJson(WIKIDATA_URL, {
    method: "POST",
    headers: {
      accept: "application/sparql-results+json",
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent": "Nuvio-Anime-Releases-Addon/2.17.11 (+https://nuvio-anime-releases-addon-rho.vercel.app/)",
    },
    body: new URLSearchParams({ query, format: "json" }).toString(),
  });

  const result = new Map();
  for (const binding of payload?.results?.bindings || []) {
    const mal = binding.mal?.value;
    const anilist = binding.anilist?.value;
    const label = binding.label?.value;
    const compatible = binding.imdb?.value
      ? binding.imdb.value
      : binding.tmdb?.value
        ? `tmdb:${binding.tmdb.value}`
        : binding.tvdb?.value
          ? `tvdb:${binding.tvdb.value}`
          : null;
    if (!compatible) continue;
    if (mal) result.set(`mal:${mal}`, compatible);
    if (anilist) result.set(`anilist:${anilist}`, compatible);
    if (label) {
      for (const sourceId of sourceIdsByName.get(label.toLowerCase()) || []) result.set(sourceId, compatible);
    }
  }
  return result;
}

function originalNameCandidates(media) {
  if (!media) return [];
  const titles = [media.title?.romaji, media.title?.english, media.title?.native, ...(Array.isArray(media.synonyms) ? media.synonyms : [])]
    .filter(Boolean)
    .map((name) => String(name).trim())
    .filter(Boolean);
  const candidates = new Set(titles);
  for (const name of titles) {
    const base = stripSeasonSuffix(name);
    if (base && base !== name) candidates.add(base);
  }
  return [...candidates];
}

function stripSeasonSuffix(name) {
  return String(name)
    .replace(/\s*[-:–—]\s*(?:season|part|cour)\s*[0-9IVXLCDM]+\s*$/i, "")
    .replace(/\s+(?:season|part|cour)\s*[0-9IVXLCDM]+\s*$/i, "")
    .replace(/\s+(?:[0-9]+(?:st|nd|rd|th)?|[IVXLCDM]+)\s+season\s*$/i, "")
    .replace(/\s*\(?(?:season|part|cour)\s*[0-9IVXLCDM]+\)?\s*$/i, "")
    .trim();
}

function escapeSparqlString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function parseId(id, prefix) {
  const match = String(id || "").match(new RegExp(`^${prefix}:(\\d+)$`, "i"));
  return match ? Number(match[1]) : null;
}

function extractCompatibleId(links) {
  for (const link of Array.isArray(links) ? links : []) {
    const site = String(link?.site || "");
    const url = String(link?.url || "");
    if (/imdb/i.test(site)) {
      const match = url.match(/tt\d+/i);
      if (match) return match[0].toLowerCase();
    }
    if (/tmdb/i.test(site)) {
      const match = url.match(/(?:tv|movie)\/(\d+)/i);
      if (match) return `tmdb:${match[1]}`;
    }
    if (/tvdb/i.test(site)) {
      const match = url.match(/(?:series|dereferrer\/series)\/(\d+)/i);
      if (match) return `tvdb:${match[1]}`;
    }
  }
  return null;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

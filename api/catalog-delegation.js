import stremioHandler from "./stremio.js";

const ANILIST_URL = "https://graphql.anilist.co";
const WIKIDATA_URL = "https://query.wikidata.org/sparql";
const FETCH_TIMEOUT_MS = 8000;

export default async function handler(req, res) {
  const captured = { statusCode: 200, headers: {}, body: null };
  const proxyRes = {
    status(code) { captured.statusCode = code; return proxyRes; },
    setHeader(name, value) { captured.headers[name] = value; },
    json(body) { captured.body = body; return body; },
  };

  await stremioHandler(req, proxyRes);

  // This endpoint is only mounted on catalog routes, so do not depend on
  // Vercel rewrite query propagation to decide whether delegation runs.
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
  const wikidata = await queryWikidataMappings(unresolved);

  return rows.map((meta) => {
    const sourceId = String(meta?.id || "");
    const anilistMapped = extractCompatibleId(byKey.get(sourceId)?.externalLinks);
    const mapped = anilistMapped || wikidata.get(sourceId);
    return mapped ? { ...meta, id: mapped } : meta;
  });
}

async function queryMedia(filter) {
  const variableName = Object.keys(filter)[0];
  const query = `query ($ids:[Int]) { Page(perPage:50) { media(type:ANIME,${variableName}:$ids) { id idMal externalLinks { site url } } } }`;
  const payload = await fetchJson(ANILIST_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables: { ids: Object.values(filter)[0] } }),
  });
  return payload?.data?.Page?.media || [];
}

async function queryWikidataMappings(metas) {
  const ids = metas
    .map((meta) => {
      const id = String(meta?.id || "");
      const mal = parseId(id, "mal");
      const anilist = parseId(id, "anilist");
      return mal ? { key: id, property: "P4086", value: mal } : anilist ? { key: id, property: "P8729", value: anilist } : null;
    })
    .filter(Boolean);
  if (!ids.length) return new Map();

  const values = ids.map(({ property, value }) => `(wdt:${property} "${value}")`).join(" ");
  const query = `SELECT ?item ?mal ?anilist ?imdb ?tmdb ?tvdb WHERE { VALUES (?property ?value) { ${values} } ?item ?property ?value . OPTIONAL { ?item wdt:P4086 ?mal } OPTIONAL { ?item wdt:P8729 ?anilist } OPTIONAL { ?item wdt:P345 ?imdb } OPTIONAL { ?item wdt:P4983 ?tmdb } OPTIONAL { ?item wdt:P4835 ?tvdb } } LIMIT 200`;
  const payload = await fetchJson(`${WIKIDATA_URL}?query=${encodeURIComponent(query)}&format=json`, {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": "Nuvio-Anime-Releases-Addon/2.17.0 (+https://nuvio-anime-releases-addon-rho.vercel.app/)",
    },
  });

  const result = new Map();
  for (const binding of payload?.results?.bindings || []) {
    const mal = binding.mal?.value;
    const anilist = binding.anilist?.value;
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
  }
  return result;
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

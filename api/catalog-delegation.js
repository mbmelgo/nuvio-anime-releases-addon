import stremioHandler from "./stremio.js";

const ANILIST_URL = "https://graphql.anilist.co";
const FETCH_TIMEOUT_MS = 8000;

export default async function handler(req, res) {
  const captured = { statusCode: 200, headers: {}, body: null };
  const proxyRes = {
    status(code) { captured.statusCode = code; return proxyRes; },
    setHeader(name, value) { captured.headers[name] = value; },
    json(body) { captured.body = body; return body; },
  };

  await stremioHandler(req, proxyRes);

  if (req.query?.resource !== "catalog" || req.query?.type !== "series" || !captured.body?.metas) {
    return sendCaptured(res, captured);
  }

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

  return rows.map((meta) => {
    const sourceId = String(meta?.id || "");
    const mapped = byKey.get(sourceId);
    const imdbId = extractImdbId(mapped?.externalLinks);
    return imdbId ? { ...meta, id: imdbId } : meta;
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

function parseId(id, prefix) {
  const match = String(id || "").match(new RegExp(`^${prefix}:(\\d+)$`, "i"));
  return match ? Number(match[1]) : null;
}

function extractImdbId(links) {
  for (const link of Array.isArray(links) ? links : []) {
    if (!/imdb/i.test(String(link?.site || ""))) continue;
    const match = String(link?.url || "").match(/tt\d+/i);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

async function fetchJson(url, options) {
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

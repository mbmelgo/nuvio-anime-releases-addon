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

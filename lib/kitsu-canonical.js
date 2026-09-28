const ARM_URL = "https://arm.haglund.dev/api/v2/ids";
const ANIZIP_URL = "https://api.ani.zip/mappings";
const MALSYNC_URL = "https://api.malsync.moe/mal/anime";
const KITSU_URL = "https://kitsu.io/api/edge/anime";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CONCURRENCY = 6;

const cache = new Map();

/**
 * AniSync-inspired canonicalization for catalog identities.
 *
 * The release catalog remains authoritative for airing/season data. This
 * module only tries to attach a verified Kitsu identity. If no trustworthy
 * mapping is available, the original MAL/AniList identity is preserved.
 */
export async function canonicalizeCatalogMetas(metas, options = {}) {
  if (!Array.isArray(metas) || metas.length === 0) return Array.isArray(metas) ? metas : [];
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || Date.now();
  const workerCount = Math.min(MAX_CONCURRENCY, metas.length);
  const output = new Array(metas.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= metas.length) return;
      output[index] = await canonicalizeMeta(metas[index], { fetchImpl, now });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return output;
}

export function canonicalizeId(sourceId, kitsuId) {
  if (kitsuId) return `kitsu:${String(kitsuId)}`;
  return sourceId;
}

export function normalizeTitle(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleMatches(sourceTitle, candidate) {
  const source = normalizeTitle(sourceTitle);
  if (!source || !candidate) return false;
  const candidates = [candidate.canonicalTitle, ...(Object.values(candidate.titles || {}))]
    .filter(Boolean)
    .map(normalizeTitle);
  return candidates.includes(source);
}

async function canonicalizeMeta(meta, context) {
  if (!meta?.id) return meta;
  if (String(meta.id).startsWith("kitsu:")) return meta;

  const parsed = parseSourceId(meta.id);
  if (!parsed) return meta;

  const kitsuId = await resolveToKitsu(parsed, meta.name, context);
  if (!kitsuId) return meta;

  return { ...meta, id: canonicalizeId(meta.id, kitsuId), extra: { ...(meta.extra || {}), kitsuId: String(kitsuId) } };
}

function parseSourceId(id) {
  const match = String(id).match(/^(mal|anilist):(\d+)$/i);
  return match ? { source: match[1].toLowerCase(), id: match[2] } : null;
}

async function resolveToKitsu(source, title, { fetchImpl, now }) {
  const key = `${source.source}:${source.id}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.kitsuId || null;
  if (cached) cache.delete(key);

  const resolvers = source.source === "mal"
    ? [resolveWithArmFromMal, resolveWithAniZipFromMal, resolveWithMalSync, resolveWithKitsuTitle]
    : [resolveWithArmFromAniList, resolveWithAniZipFromAniList, resolveWithKitsuTitle];

  for (const resolver of resolvers) {
    try {
      const kitsuId = await resolver(source.id, title, fetchImpl);
      if (kitsuId) {
        cache.set(key, { kitsuId: String(kitsuId), expiresAt: now + CACHE_TTL_MS });
        return String(kitsuId);
      }
    } catch (error) {
      // A resolver is a fallback source; one provider failing must not remove
      // the catalog item or prevent later resolvers from being attempted.
      if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] ${resolver.name} failed for ${key}:`, error?.message || error);
    }
  }

  cache.set(key, { kitsuId: null, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
  return null;
}

async function resolveWithArmFromMal(id, _title, fetchImpl) {
  const data = await getJson(fetchImpl, ARM_URL, {
    source: "myanimelist",
    id,
    include: "kitsu,anilist",
  });
  return data?.kitsu ? String(data.kitsu) : null;
}

async function resolveWithArmFromAniList(id, _title, fetchImpl) {
  const data = await getJson(fetchImpl, ARM_URL, {
    source: "anilist",
    id,
    include: "kitsu,myanimelist",
  });
  return data?.kitsu ? String(data.kitsu) : null;
}

async function resolveWithAniZipFromMal(id, _title, fetchImpl) {
  return resolveWithAniZip(id, "mal_id", fetchImpl);
}

async function resolveWithAniZipFromAniList(id, _title, fetchImpl) {
  return resolveWithAniZip(id, "anilist_id", fetchImpl);
}

async function resolveWithAniZip(id, parameter, fetchImpl) {
  const data = await getJson(fetchImpl, ANIZIP_URL, { [parameter]: id });
  const mappings = data?.mappings || {};
  return mappings.kitsu_id ? String(mappings.kitsu_id) : null;
}

async function resolveWithMalSync(id, _title, fetchImpl) {
  const data = await getJson(fetchImpl, `${MALSYNC_URL}/${encodeURIComponent(id)}`);
  const sites = data?.Sites?.Kitsu || {};
  for (const value of Object.values(sites)) {
    if (value?.id) return String(value.id);
  }
  return null;
}

async function resolveWithKitsuTitle(_id, title, fetchImpl) {
  if (!title) return null;
  const data = await getJson(fetchImpl, KITSU_URL, {
    "filter[text]": title,
    "page[limit]": "10",
  }, { acceptJsonApi: true });
  const rows = Array.isArray(data?.data) ? data.data : [];
  const candidates = rows.map((row) => ({
    id: row?.id,
    canonicalTitle: row?.attributes?.canonicalTitle,
    titles: row?.attributes?.titles || {},
  }));
  const exact = candidates.find((candidate) => titleMatches(title, candidate));
  return exact?.id ? String(exact.id) : null;
}

async function getJson(fetchImpl, url, params, options = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params || {})) {
    if (value != null) target.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(target, {
      headers: options.acceptJsonApi
        ? { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" }
        : { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function clearCanonicalizationCache() {
  cache.clear();
}

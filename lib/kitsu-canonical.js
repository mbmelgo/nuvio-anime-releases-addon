const ARM_URL = "https://arm.haglund.dev/api/v2/ids";
const ANIZIP_URL = "https://api.ani.zip/mappings";
const MALSYNC_URL = "https://api.malsync.moe/mal/anime";
const KITSU_URL = "https://kitsu.io/api/edge/anime";
const ANILIST_URL = "https://graphql.anilist.co";
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NEGATIVE_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CONCURRENCY = 6;
const MAX_ROOT_RELATION_DEPTH = 8;

const cache = new Map();
const verifiedKitsuCache = new Map();
const tvdbCache = new Map();
const rootTvdbCache = new Map();

export async function canonicalizeCatalogMetas(metas, options = {}) {
  if (!Array.isArray(metas) || metas.length === 0) return Array.isArray(metas) ? metas : [];
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || Date.now();
  const unique = new Map();
  for (const meta of metas) {
    if (!meta?.id || String(meta.id).startsWith("kitsu:")) continue;
    const parsed = parseSourceId(meta.id);
    if (parsed && !unique.has(`${parsed.source}:${parsed.id}`)) unique.set(`${parsed.source}:${parsed.id}`, meta);
  }
  const resolved = new Map();
  const entries = [...unique.entries()];
  let cursor = 0;
  const workerCount = Math.min(MAX_CONCURRENCY, entries.length);
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= entries.length) return;
      const [key, meta] = entries[index];
      const identity = await resolveToCanonicalIdentity(parseSourceId(meta.id), getMetaTitles(meta), meta, { fetchImpl, now });
      resolved.set(key, identity);
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return metas.map((meta) => {
    if (!meta?.id || String(meta.id).startsWith("kitsu:")) return meta;
    const parsed = parseSourceId(meta.id);
    if (!parsed) return meta;
    const identity = resolved.get(`${parsed.source}:${parsed.id}`);
    if (!identity) return meta;
    const id = canonicalizeId(meta.id, identity.kitsuId, identity.tvdbId);
    return {
      ...meta,
      id,
      extra: {
        ...(meta.extra || {}),
        ...(identity.kitsuId ? { kitsuId: String(identity.kitsuId) } : {}),
        ...(identity.tvdbId ? { tvdbId: String(identity.tvdbId) } : {}),
        ...(identity.tvdbSourceAnilistId ? { tvdbSourceAnilistId: String(identity.tvdbSourceAnilistId) } : {}),
        originalCatalogId: meta.id,
      },
    };
  });
}

export function canonicalizeId(sourceId, _kitsuId, tvdbId) {
  if (tvdbId) return `tvdb:${String(tvdbId)}`;
  return sourceId;
}

export function normalizeTitle(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/[’'`]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

export function titleMatches(sourceTitle, candidate) {
  const sources = titleVariants(sourceTitle);
  if (!sources.length || !candidate) return false;
  const candidates = [candidate.canonicalTitle, ...(Object.values(candidate.titles || {}))]
    .filter(Boolean)
    .flatMap((value) => titleVariants(value));
  return sources.some((source) => candidates.includes(source));
}

function titleVariants(value) {
  if (Array.isArray(value)) return [...new Set(value.flatMap((item) => titleVariants(item)))];
  const normalized = normalizeTitle(value);
  return normalized ? [normalized] : [];
}

function getMetaTitles(meta) {
  const extra = meta?.extra || {};
  return [meta?.name, extra.titleEnglish, extra.titleRomaji, extra.titleNative].filter(Boolean);
}

async function resolveToCanonicalIdentity(source, titles, meta, { fetchImpl, now }) {
  const key = `${source.source}:${source.id}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.identity;
  if (cached) cache.delete(key);
  const resolvers = source.source === "mal"
    ? [resolveWithArmFromMal, resolveWithAniZipFromMal, resolveWithMalSync, resolveWithKitsuTitle]
    : [resolveWithArmFromAniList, resolveWithAniZipFromAniList, resolveWithKitsuTitle];
  for (const resolver of resolvers) {
    try {
      const result = await resolver(source.id, titles, fetchImpl);
      const kitsuId = typeof result === "object" ? result?.kitsuId : result;
      const mappedTvdbId = typeof result === "object" ? result?.tvdbId : null;
      if (!kitsuId) continue;
      if (!(await verifyKitsuTitle(kitsuId, titles, fetchImpl, now))) continue;
      let tvdbId = mappedTvdbId || await resolveKitsuToTvdb(kitsuId, fetchImpl, now);
      let tvdbSourceAnilistId = null;
      if (!tvdbId) {
        const root = await resolveRootTvdb(meta, fetchImpl, now);
        tvdbId = root?.tvdbId || null;
        tvdbSourceAnilistId = root?.anilistId || null;
      }
      const identity = { kitsuId: String(kitsuId), tvdbId: tvdbId ? String(tvdbId) : null, tvdbSourceAnilistId };
      cache.set(key, { identity, expiresAt: now + CACHE_TTL_MS });
      return identity;
    } catch (error) {
      if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] ${resolver.name} failed for ${key}:`, error?.message || error);
    }
  }

  // A seasonal entry can legitimately have no current Kitsu mapping. Do not
  // stop there: walk the AniList PREQUEL/PARENT chain and canonicalize the
  // first verified ancestor that has a TVDB series mapping.
  try {
    const root = await resolveRootTvdb(meta, fetchImpl, now);
    if (root?.tvdbId) {
      const identity = { kitsuId: root.kitsuId || null, tvdbId: String(root.tvdbId), tvdbSourceAnilistId: String(root.anilistId) };
      cache.set(key, { identity, expiresAt: now + CACHE_TTL_MS });
      return identity;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] root fallback failed for ${key}:`, error?.message || error);
  }

  const identity = { kitsuId: null, tvdbId: null, tvdbSourceAnilistId: null };
  cache.set(key, { identity, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
  return identity;
}

async function resolveRootTvdb(meta, fetchImpl, now) {
  const startingId = Number(meta?.extra?.anilistId);
  if (!Number.isInteger(startingId) || startingId <= 0) return null;
  const cacheKey = String(startingId);
  const cached = rootTvdbCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.identity;
  if (cached) rootTvdbCache.delete(cacheKey);
  const queue = [{ id: startingId, depth: 0 }];
  const visited = new Set();
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id) || current.depth > MAX_ROOT_RELATION_DEPTH) continue;
    visited.add(current.id);
    let media;
    try {
      media = await getAniListMedia(current.id, fetchImpl);
    } catch (error) {
      if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] AniList root lookup failed for ${current.id}:`, error?.message || error);
      continue;
    }
    if (!media) continue;
    if (current.id !== startingId) {
      const identity = await resolveAniListNodeToTvdb(media, fetchImpl, now);
      if (identity?.tvdbId) {
        const result = { tvdbId: String(identity.tvdbId), anilistId: String(media.id), kitsuId: identity.kitsuId ? String(identity.kitsuId) : null };
        rootTvdbCache.set(cacheKey, { identity: result, expiresAt: now + CACHE_TTL_MS });
        return result;
      }
    }
    const predecessors = (media.relations?.edges || [])
      .filter((edge) => ["PREQUEL", "PARENT"].includes(String(edge?.relationType || "").toUpperCase()))
      .map((edge) => edge?.node)
      .filter((node) => Number.isInteger(Number(node?.id)) && Number(node.id) > 0)
      .sort((a, b) => relationPriority(a) - relationPriority(b));
    for (const node of predecessors) if (!visited.has(Number(node.id))) queue.push({ id: Number(node.id), depth: current.depth + 1 });
  }
  rootTvdbCache.set(cacheKey, { identity: null, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
  return null;
}

function relationPriority(node) {
  const format = String(node?.format || "").toUpperCase();
  return format === "TV" ? 0 : format === "ONA" ? 1 : 2;
}

async function resolveAniListNodeToTvdb(media, fetchImpl, now) {
  const anilistId = String(media.id);
  const titles = [media.title?.english, media.title?.romaji, media.title?.native].filter(Boolean);
  for (const resolver of [resolveWithArmFromAniList, resolveWithAniZipFromAniList, resolveWithKitsuTitle]) {
    try {
      const result = await resolver(anilistId, titles, fetchImpl);
      const kitsuId = typeof result === "object" ? result?.kitsuId : result;
      const mappedTvdbId = typeof result === "object" ? result?.tvdbId : null;
      if (!kitsuId) continue;
      if (!(await verifyKitsuTitle(kitsuId, titles, fetchImpl, now))) continue;
      const tvdbId = mappedTvdbId || await resolveKitsuToTvdb(kitsuId, fetchImpl, now);
      if (tvdbId) return { kitsuId: String(kitsuId), tvdbId: String(tvdbId) };
    } catch (error) {
      if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] root resolver ${resolver.name} failed for anilist:${anilistId}:`, error?.message || error);
    }
  }
  return null;
}

async function getAniListMedia(anilistId, fetchImpl) {
  const query = `query ($id:Int) { Media(id:$id,type:ANIME) { id idMal format title { romaji english native } relations { edges { relationType node { id idMal format title { romaji english native } } } } } }`;
  const response = await fetchImpl(ANILIST_URL, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ query, variables: { id: Number(anilistId) } }) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errors) throw new Error(json.errors?.map((x) => x.message).join("; ") || `AniList HTTP ${response.status}`);
  return json.data?.Media || null;
}

async function verifyKitsuTitle(kitsuId, sourceTitles, fetchImpl, now) {
  const titles = titleVariants(sourceTitles);
  if (!titles.length) return false;
  const key = String(kitsuId);
  const cached = verifiedKitsuCache.get(key);
  if (cached && cached.expiresAt > now) return cached.matches;
  if (cached) verifiedKitsuCache.delete(key);
  const data = await getJson(fetchImpl, `${KITSU_URL}/${encodeURIComponent(key)}`, {}, { acceptJsonApi: true });
  const attributes = data?.data?.attributes;
  const candidate = attributes ? { canonicalTitle: attributes.canonicalTitle, titles: attributes.titles || {} } : null;
  const matches = titleMatches(titles, candidate);
  verifiedKitsuCache.set(key, { matches, expiresAt: now + CACHE_TTL_MS });
  return matches;
}

async function resolveKitsuToTvdb(kitsuId, fetchImpl, now) {
  const key = String(kitsuId);
  const cached = tvdbCache.get(key);
  if (cached && cached.expiresAt > now) return cached.tvdbId || null;
  if (cached) tvdbCache.delete(key);
  try {
    const data = await getJson(fetchImpl, `${KITSU_URL}/${encodeURIComponent(key)}/mappings`, {}, { acceptJsonApi: true });
    const rows = Array.isArray(data?.data) ? data.data : [];
    const seriesMapping = rows.find((row) => String(row?.attributes?.externalSite || "").toLowerCase() === "thetvdb/series" && /^\d+$/.test(String(row?.attributes?.externalId || "")));
    if (seriesMapping?.attributes?.externalId) {
      const tvdbId = String(seriesMapping.attributes.externalId);
      tvdbCache.set(key, { tvdbId, expiresAt: now + CACHE_TTL_MS });
      return tvdbId;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] Kitsu TVDB mapping failed for ${key}:`, error?.message || error);
  }
  try {
    const data = await getJson(fetchImpl, ANIZIP_URL, { kitsu_id: key });
    const tvdbId = data?.mappings?.thetvdb_id;
    if (tvdbId != null && /^\d+$/.test(String(tvdbId))) {
      const normalized = String(tvdbId);
      tvdbCache.set(key, { tvdbId: normalized, expiresAt: now + CACHE_TTL_MS });
      return normalized;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "test") console.warn(`[kitsu-canonical] AniZip TVDB mapping failed for ${key}:`, error?.message || error);
  }
  tvdbCache.set(key, { tvdbId: null, expiresAt: now + NEGATIVE_CACHE_TTL_MS });
  return null;
}

function parseSourceId(id) {
  const match = String(id).match(/^(mal|anilist):(\d+)$/i);
  return match ? { source: match[1].toLowerCase(), id: match[2] } : null;
}

async function resolveWithArmFromMal(id, _titles, fetchImpl) {
  const data = await getJson(fetchImpl, ARM_URL, { source: "myanimelist", id, include: "kitsu,anilist" });
  return data?.kitsu ? String(data.kitsu) : null;
}

async function resolveWithArmFromAniList(id, _titles, fetchImpl) {
  const data = await getJson(fetchImpl, ARM_URL, { source: "anilist", id, include: "kitsu,myanimelist" });
  return data?.kitsu ? String(data.kitsu) : null;
}

async function resolveWithAniZipFromMal(id, _titles, fetchImpl) { return resolveWithAniZip(id, "mal_id", fetchImpl); }
async function resolveWithAniZipFromAniList(id, _titles, fetchImpl) { return resolveWithAniZip(id, "anilist_id", fetchImpl); }

async function resolveWithAniZip(id, parameter, fetchImpl) {
  const data = await getJson(fetchImpl, ANIZIP_URL, { [parameter]: id });
  const mappings = data?.mappings || {};
  return mappings.kitsu_id ? { kitsuId: String(mappings.kitsu_id), tvdbId: mappings.thetvdb_id ? String(mappings.thetvdb_id) : null } : null;
}

async function resolveWithMalSync(id, _titles, fetchImpl) {
  const data = await getJson(fetchImpl, `${MALSYNC_URL}/${encodeURIComponent(id)}`);
  const sites = data?.Sites?.Kitsu || {};
  for (const value of Object.values(sites)) if (value?.id) return String(value.id);
  return null;
}

async function resolveWithKitsuTitle(_id, titles, fetchImpl) {
  const variants = titleVariants(titles);
  for (const title of variants) {
    const data = await getJson(fetchImpl, KITSU_URL, { "filter[text]": title, "page[limit]": "10" }, { acceptJsonApi: true });
    const rows = Array.isArray(data?.data) ? data.data : [];
    const candidates = rows.map((row) => ({ id: row?.id, canonicalTitle: row?.attributes?.canonicalTitle, titles: row?.attributes?.titles || {} }));
    const exact = candidates.find((candidate) => titleMatches(variants, candidate));
    if (exact?.id) return String(exact.id);
  }
  return null;
}

async function getJson(fetchImpl, url, params, options = {}) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params || {})) if (value != null) target.searchParams.set(key, String(value));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(target, { headers: options.acceptJsonApi ? { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" } : { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function clearCanonicalizationCache() {
  cache.clear();
  verifiedKitsuCache.clear();
  tvdbCache.clear();
  rootTvdbCache.clear();
}

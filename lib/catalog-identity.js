import { resolveExternalMetadataIdsByAniListIds } from "./external-title-ids.js";
import { resolveWithAniBridgeTvdb as defaultResolveWithAniBridgeTvdb } from "./canonical-providers.js";
import { validateTvdbCandidate as defaultValidateTvdbCandidate } from "./canonical-validation.js";
import { getMetaTitles } from "./canonical-utils.js";

const SUPPORTED_ID = /^(?:tt\d+|tmdb:\d+|tvdb:\d+)$/i;
const FALLBACK_CONCURRENCY = 4;

function releaseYear(meta) {
  const released = String(meta?.released || "").match(/^(\d{4})/);
  if (released) return Number(released[1]);
  const releaseInfo = String(meta?.releaseInfo || "").match(/^(\d{4})/);
  return releaseInfo ? Number(releaseInfo[1]) : null;
}

function sourceIdentity(meta) {
  const anilistId = String(meta?.extra?.anilistId ?? "").trim();
  if (/^\d+$/.test(anilistId)) return { source: "anilist", sourceId: anilistId };
  const malId = String(meta?.extra?.malId ?? "").trim();
  if (/^\d+$/.test(malId)) return { source: "mal", sourceId: malId };
  return null;
}

export async function canonicalizeCatalogMetasFast(metas, options = {}) {
  if (!Array.isArray(metas) || metas.length === 0) return [];

  const resolved = [];
  const unresolved = [];
  for (const meta of metas) {
    if (!meta?.id) continue;
    if (SUPPORTED_ID.test(String(meta.id))) resolved.push(meta);
    else unresolved.push(meta);
  }

  if (!unresolved.length) return resolved;

  const ids = unresolved
    .map((meta) => meta?.extra?.anilistId)
    .filter((id) => /^\d+$/.test(String(id || "")))
    .map(String);
  const resolver = options.resolveExternalMetadataIdsByAniListIds || resolveExternalMetadataIdsByAniListIds;
  const mappings = ids.length ? await resolver(ids, unresolved, options.fetchImpl || fetch) : new Map();
  const remaining = [];

  for (const meta of unresolved) {
    const originalId = String(meta.id);
    const mapping = mappings.get(String(meta?.extra?.anilistId || ""));

    if (mapping?.tmdb) {
      const tmdbId = String(mapping.tmdb);
      resolved.push({ ...meta, id: `tmdb:${tmdbId}`, extra: { ...(meta.extra || {}), tmdbId, originalCatalogId: originalId } });
      continue;
    }
    if (mapping?.imdb) {
      const imdbId = String(mapping.imdb);
      resolved.push({ ...meta, id: imdbId, extra: { ...(meta.extra || {}), imdbId, originalCatalogId: originalId } });
      continue;
    }
    if (mapping?.tvdb) {
      const tvdbId = String(mapping.tvdb);
      resolved.push({ ...meta, id: `tvdb:${tvdbId}`, extra: { ...(meta.extra || {}), tvdbId, originalCatalogId: originalId } });
      continue;
    }
    remaining.push(meta);
  }

  if (!remaining.length || options.allowProviderFallback === false) return resolved;

  const fetchImpl = options.fetchImpl || fetch;
  const resolveWithAniBridgeTvdb = options.resolveWithAniBridgeTvdb || defaultResolveWithAniBridgeTvdb;
  const validateTvdbCandidate = options.validateTvdbCandidate || defaultValidateTvdbCandidate;
  const concurrency = Math.max(1, Number(options.fallbackConcurrency || FALLBACK_CONCURRENCY));
  const fallback = new Array(remaining.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= remaining.length) return;
      const meta = remaining[index];
      const originalId = String(meta.id);
      const identity = sourceIdentity(meta);
      if (!identity) continue;
      try {
        const candidate = await resolveWithAniBridgeTvdb(identity.source, identity.sourceId, fetchImpl, options.now || Date.now());
        if (!candidate) continue;
        const validation = await validateTvdbCandidate(getMetaTitles(meta), String(candidate), releaseYear(meta), fetchImpl);
        if (validation.status === "rejected") continue;
        const tvdbId = String(validation.tvdbId || candidate);
        fallback[index] = { ...meta, id: `tvdb:${tvdbId}`, extra: { ...(meta.extra || {}), tvdbId, originalCatalogId: originalId } };
      } catch {
        // An individual unresolved title must not fail the whole catalog page.
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, remaining.length) }, () => worker()));
  return [...resolved, ...fallback.filter(Boolean)];
}

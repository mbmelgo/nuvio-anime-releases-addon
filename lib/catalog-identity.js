import { resolveExternalMetadataIdsByAniListIds } from "./external-title-ids.js";
import { resolveWithAniBridgeTvdb } from "./canonical-providers.js";
import { validateTvdbCandidate } from "./canonical-validation.js";
import { getMetaTitles } from "./canonical-utils.js";

const SUPPORTED_ID = /^(?:tmdb|imdb):/;

function releaseYear(meta) {
  const released = String(meta?.released || "").match(/^(\d{4})/);
  if (released) return Number(released[1]);
  const releaseInfo = String(meta?.releaseInfo || "").match(/^(\d{4})/);
  return releaseInfo ? Number(releaseInfo[1]) : null;
}

/**
 * Resolve catalog identities using a bounded, catalog-specific identity path.
 * Direct TMDB/IMDb identities are retained immediately. AniList candidates are
 * first resolved in one batched Wikidata lookup; only candidates that remain
 * unresolved use the single-source AniBridge→TVDB path, in parallel, with
 * title/year validation. The full multi-provider/root resolver is never used
 * on the catalog critical path.
 */
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
      resolved.push({ ...meta, id: `tmdb:${mapping.tmdb}`, extra: { ...(meta.extra || {}), tmdbId: String(mapping.tmdb), originalCatalogId: originalId } });
      continue;
    }
    if (mapping?.imdb) {
      resolved.push({ ...meta, id: `imdb:${mapping.imdb}`, extra: { ...(meta.extra || {}), imdbId: String(mapping.imdb), originalCatalogId: originalId } });
      continue;
    }
    remaining.push(meta);
  }

  if (!remaining.length) return resolved;

  const fetchImpl = options.fetchImpl || fetch;
  const fallback = await Promise.all(remaining.map(async (meta) => {
    const originalId = String(meta.id);
    const sourceId = meta?.extra?.anilistId ? String(meta.extra.anilistId) : meta?.extra?.malId ? String(meta.extra.malId) : null;
    const source = meta?.extra?.anilistId ? "anilist" : meta?.extra?.malId ? "mal" : null;
    if (!source || !sourceId) return null;
    try {
      const candidate = await resolveWithAniBridgeTvdb(source, sourceId, fetchImpl, options.now || Date.now());
      if (!candidate) return null;
      const validation = await validateTvdbCandidate(getMetaTitles(meta), String(candidate), releaseYear(meta), fetchImpl);
      if (validation.status === "rejected") return null;
      const tvdbId = String(validation.tvdbId || candidate);
      return { ...meta, id: `tvdb:${tvdbId}`, extra: { ...(meta.extra || {}), tvdbId, originalCatalogId: originalId } };
    } catch {
      return null;
    }
  }));

  return [...resolved, ...fallback.filter(Boolean)];
}

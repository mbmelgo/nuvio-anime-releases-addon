import { resolveExternalMetadataIdsByAniListIds } from "./external-title-ids.js";

const SUPPORTED_ID = /^(?:tmdb|imdb):/;

/**
 * Resolve catalog identities using only cheap, deterministic inputs.
 * Direct TMDB/IMDb identities are retained immediately. For AniList/MAL
 * inputs, a single batched AniList-ID lookup can provide supported metadata
 * identities without invoking the full TVDB/Kitsu/root reconciliation chain.
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

  if (!ids.length) return resolved;

  const resolver = options.resolveExternalMetadataIdsByAniListIds || resolveExternalMetadataIdsByAniListIds;
  const mappings = await resolver(ids, unresolved, options.fetchImpl || fetch);

  for (const meta of unresolved) {
    const originalId = String(meta.id);
    const mapping = mappings.get(String(meta?.extra?.anilistId || ""));
    if (!mapping) continue;
    if (mapping.tmdb) {
      resolved.push({
        ...meta,
        id: `tmdb:${mapping.tmdb}`,
        extra: { ...(meta.extra || {}), tmdbId: String(mapping.tmdb), originalCatalogId: originalId },
      });
    } else if (mapping.imdb) {
      resolved.push({
        ...meta,
        id: `imdb:${mapping.imdb}`,
        extra: { ...(meta.extra || {}), imdbId: String(mapping.imdb), originalCatalogId: originalId },
      });
    }
  }

  return resolved;
}

/**
 * Vercel scans every JavaScript module under api/ as a serverless function.
 * Keep a valid default handler even though catalog identity delegation is no
 * longer a runtime transformation.
 */
export default function handler(req, res) {
  res.status(404).json({ error: "Not found" });
}

/**
 * Catalog identity policy:
 *
 * The catalog owns the identity of an anime entry. Provider-specific IDs
 * (IMDb/TMDB/TVDB) must never replace that identity after catalog generation.
 * Nuvio/BingeCat can resolve the stable MAL/AniList identity directly, while
 * external mappings belong to metadata resolution rather than catalog identity.
 *
 * This function is intentionally a no-op. Keeping the delegation boundary in
 * place makes the architecture explicit and prevents accidental reintroduction
 * of destructive ID rewriting.
 */
export async function delegateCompatibleIds(metas) {
  return Array.isArray(metas) ? metas : [];
}

/**
 * Deprecated compatibility helper.
 *
 * Wikidata mappings are no longer allowed to mutate catalog IDs. Returning an
 * empty map preserves the old helper's API without allowing ambiguous external
 * mappings to collapse a catalog entry into a different work.
 */
export function selectUniqueWikidataMappings() {
  return new Map();
}

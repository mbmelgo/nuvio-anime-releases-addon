# Anime Releases for Nuvio — v3.26.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.26.0`
- **Production release:** `v3.25.0`
- **Latest production tag:** `v3.25.0`
- **Next minor release baseline:** `3.26.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; seasonal entries can traverse AniList PREQUEL/PARENT relationships to locate a verified root/franchise TVDB series; English, romaji, and native/Japanese title variants are compared during canonicalization; otherwise the original `mal:` / `anilist:` identity is preserved
- **Canonicalization implementation:** split into serverless-safe modules under `lib/`, while `lib/kitsu-canonical.js` remains the stable compatibility entry point
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Catalog search:** all five catalogs advertise optional search support and match English, romaji, and native/Japanese titles; Stremio catalog extra parameters are parsed from the protocol path, including `.json` on the final extra value and combined `search` + `skip` forms
- **Identity validation:** TVDB candidates are validated against title, year, continuation/season evidence, and provider identity evidence before being exposed to Nuvio; continuing TVDB series can represent later seasons when the base title matches, without collapsing unrelated franchise entries or reboot identities; when TVDB is a franchise-level mismatch, validated IMDb/TMDB identities can be used as BingeCat-compatible fallbacks
- **Title display priority:** English → Romaji → native/Japanese, while identity matching continues to consider all supported title variants and aliases
- **Provider resilience:** AniList 429 responses now honor `Retry-After` and retry with bounded backoff before failing, reducing transient catalog failures during AniList rate limiting
- **External identity fallback:** exact, unique Wikidata title matches can recover validated TMDB/IMDb identities when provider-ID mappings are unavailable or a TVDB candidate is rejected as a franchise-level mismatch
- **Recent fixes:** v3.26.0 adds exact-title TMDB/IMDb recovery for provider-mapping gaps; v3.25.0 adds generalized AniList rate-limit resilience; v3.24.0 improves reliability and accuracy of external identity mappings when TVDB collapses a distinct anime into a franchise-level identity; v3.23.0 improves validated IMDb/TMDB fallback mappings; v3.22.0 added validated IMDb/TMDB fallback and Pokémon Horizons regression coverage; v3.21.0 prefers identity mapping derived from the AniList catalog source when a conflicting MAL mapping collapses a distinct anime into a franchise-level TVDB identity; v3.20.0 adds an exact-title TVDB series-page fallback when fuzzy search returns only a broad franchise candidate; v3.19.0 evaluates all bounded TVDB title variants before accepting a result; v3.18.0 added stronger candidate validation and continuing-season recovery such as Ranma 1/2 Season 3
- **Deployment checkpoint:** **2/5** before this release; the authoritative post-release state is maintained in `ops/release-state.json`

The addon remains responsible for anime release, airing, and upcoming catalogs. AniList remains authoritative for airing dates, seasons, and upcoming episodes. Kitsu is used as the canonical anime identity layer. When a verified TVDB series mapping exists, the catalog exposes that TVDB identity because the current BingeCat integration can consume TVDB-based anime metadata. Seasonal entries that only have season-specific identities can fall back to a root series through AniList relations, preventing season IDs from being sent to BingeCat when only the franchise-level TVDB series is resolvable. When TVDB cannot represent the requested anime distinctly, validated IMDb/TMDB identities may be used because Nuvio/BingeCat has been confirmed to consume those identities. Missing mappings never cause an item to be deleted: the original MAL/AniList identity is preserved.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

# Anime Releases for Nuvio — v3.30.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.30.1`
- **Production release:** `v3.30.0`
- **Latest production tag:** `v3.30.0`
- **Next minor release baseline:** `3.31.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; seasonal entries can traverse AniList PREQUEL/PARENT relationships to locate a verified root/franchise TVDB series; English, romaji, and native/Japanese title variants are compared during canonicalization; otherwise the original `mal:` / `anilist:` identity is preserved
- **Canonicalization implementation:** split into serverless-safe modules under `lib/`, while `lib/kitsu-canonical.js` remains the stable compatibility entry point
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Catalog search:** all five catalogs advertise optional search support and match English, romaji, and native/Japanese titles; Stremio catalog extra parameters are parsed from the protocol path, including `.json` on the final extra value and combined `search` + `skip` forms
- **Identity validation:** TVDB candidates are validated against title, year, continuation/season evidence, and provider identity evidence before being exposed to Nuvio; continuing TVDB series can represent later seasons when the base title matches, without collapsing unrelated franchise entries or reboot identities; when TVDB is a franchise-level mismatch, validated IMDb/TMDB identities can be used as BingeCat-compatible fallbacks
- **Title display priority:** English → Romaji → native/Japanese, while identity matching continues to consider all supported title variants and aliases
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

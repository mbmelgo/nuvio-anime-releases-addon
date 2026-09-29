# Anime Releases for Nuvio — v3.32.2

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.32.2`
- **Production release:** `v3.32.0`
- **Latest production tag:** `v3.32.0`
- **Next minor release baseline:** `3.33.0`
- **Current autonomous deployment checkpoint:** `4/5`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unresolved identities retain their source ID until a verified mapping is available
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, alias, continuation, season, and root-title evidence are considered; season-marked titles now contribute conservative root-title variants to the existing canonical provider resolution path
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

## v3.32.1 development change

- Feed season-root title variants through the canonical metadata title boundary used by the existing provider resolution system.
- This fixes the previous implementation gap where season-root variants were generated in an unused helper rather than reaching the active canonicalization path.
- Added regression coverage for Roman-numeral and numeric season markers across English, romaji, and native titles.

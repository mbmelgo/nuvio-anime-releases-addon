# Anime Releases for Nuvio — v3.33.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.33.0`
- **Production release:** `v3.33.0`
- **Latest production tag:** `v3.33.0`
- **Next minor release baseline:** `3.34.0`
- **Autonomous deployment checkpoint:** `5/5` — stop after this production release
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unresolved identities retain their source ID until a verified mapping is available
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, aliases, continuation, season, and root-title evidence are considered; season-marked titles contribute conservative root-title variants to the TVDB title-resolution fallback while Kitsu matching remains exact
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

## v3.33.0 release

- Fixed the active canonicalization integration for season-marked root-title recovery.
- Added regression coverage for Roman-numeral, numeric, ordinal, and native-title season markers.
- Preserved strict Kitsu title matching so a season entry cannot collapse into its root series through title-only matching.
- This release addresses the catalog-ID side of the Nuvio hover/click discrepancy without adding anime-specific exceptions.

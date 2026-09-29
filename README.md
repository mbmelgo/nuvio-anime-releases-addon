# Anime Releases for Nuvio — v3.34.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.34.0`
- **Production release:** `v3.33.0`
- **Latest production tag:** `v3.33.0`
- **Next minor release baseline:** `3.34.0`
- **Autonomous deployment checkpoint:** `0/5` — new cycle resumed by explicit instruction
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Catalog pagination:** seasonal catalogs honor Nuvio `skip` and fetch only the requested AniList page when no search is active
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unresolved identities retain their source ID until a verified mapping is available
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, aliases, continuation, season, and root-title evidence are considered; season-marked titles contribute conservative root-title variants to the TVDB title-resolution fallback while Kitsu matching remains exact
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

## v3.34.0 release

- Added true backend pagination for seasonal catalogs using Nuvio's `skip` requests.
- Seasonal catalog requests without search now query only the corresponding AniList page instead of loading and canonicalizing the full catalog before slicing.
- Search requests progressively fetch only enough AniList pages to satisfy the requested Nuvio page.
- Added regression coverage for direct page selection and search pagination planning.

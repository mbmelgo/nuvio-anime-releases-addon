# Anime Releases for Nuvio — v3.36.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.36.1`
- **Production release:** `v3.35.0`
- **Latest production tag:** `v3.35.0`
- **Next minor release baseline:** `3.36.0`
- **Autonomous deployment checkpoint:** `2/5`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Catalog pagination:** seasonal catalogs honor Nuvio `skip` and fetch only the requested AniList page when no search is active; search terms are passed to AniList before canonicalization
- **Catalog identity:** seasonal catalogs use a fast AniBridge TVDB mapping plus TVDB validation, with an AniList fallback instead of running the full multi-provider canonicalization cascade
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unresolved identities retain their source ID until a verified mapping is available
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, aliases, continuation, season, and root-title evidence are considered; season-marked titles contribute conservative root-title variants to the TVDB title-resolution fallback while Kitsu matching remains exact
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

## v3.36.0 release

- Added a catalog-specific fast identity path using AniBridge TVDB mappings with existing TVDB candidate validation.
- Catalogs now fall back directly to `anilist:<id>` instead of invoking the full multi-provider title/season resolver when no fast TVDB mapping is available.
- Kept the full canonicalization path unchanged for non-catalog consumers and airing catalogs.
- Added regression coverage for validated TVDB and AniList catalog identity fallbacks.

## v3.35.0 release

- Pass Nuvio catalog search terms directly to AniList so searches do not require scanning the full seasonal catalog.
- Preserve the existing local title filter as a final compatibility check after AniList search narrowing.
- Added regression coverage for search variable propagation.

## v3.34.0 release

- Added true backend pagination for seasonal catalogs using Nuvio's `skip` requests.
- Seasonal catalog requests without search now query only the corresponding AniList page instead of loading and canonicalizing the full catalog before slicing.
- Search requests progressively fetch only enough AniList pages to satisfy the requested Nuvio page.
- Added regression coverage for direct page selection and search pagination planning.

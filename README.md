# Anime Releases for Nuvio — v3.38.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.38.0`
- **Production release:** `v3.38.0` (release in progress)
- **Latest production tag:** `v3.37.0`
- **Next minor release baseline:** `3.38.0`
- **Autonomous deployment checkpoint:** `4/5`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Catalog pagination:** Nuvio catalog pages are explicitly bounded to 10 items via the manifest `pageSize` extension; each Vercel serverless invocation processes only one requested page
- **Schedule pagination:** rolling 7-day catalogs walk AniList airing-event pages only until enough unique anime exist to fill the requested Nuvio page, avoiding under-filled pages caused by repeated episodes
- **Catalog search:** search terms are passed to AniList before canonicalization, avoiding full-season scans
- **Catalog identity:** seasonal catalogs use a fast AniBridge/Wikidata TVDB mapping path plus TVDB validation; a usable MAL identity is preserved when no TVDB mapping exists, while AniList is never used as the terminal Nuvio-facing identity
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unsupported AniList-only identities are not exposed as catalog click-through IDs
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, aliases, continuation, season, and root-title evidence are considered; conservative numeric/Roman continuation markers such as trailing `II` are recognized for root-series TVDB recovery
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use bounded negative-cache handling for transient provider misses
- **Serverless strategy:** no durable application-level cache or polling dependency is required; request work is bounded by catalog page size and provider call paths

## v3.38.0 release

- Reduced Nuvio catalog pages to 10 items and explicitly advertised that page size through the manifest so Nuvio TV can advance pagination in 10-item increments.
- Fixed rolling Latest/Upcoming 7-day catalogs that could return only a few anime because AniList paginates airing events rather than unique anime.
- Latest catalogs now retain the newest episode per anime; Upcoming catalogs retain the next scheduled episode per anime.
- Strengthened fast MAL identity resolution with Wikidata TVDB lookup and continuation/reboot TVDB recovery.
- Recognized trailing numeric/Roman continuation markers such as `II` without anime-specific exceptions.
- Added regression coverage for catalog page sizing, schedule deduplication, and the Old Country Bumpkin-style `mal:61897` failure mode.

## v3.37.0 release

- Added true page-bounded seasonal catalog processing for Nuvio `skip` pagination.
- Reduced seasonal catalog page size to 10 so each Vercel serverless invocation performs bounded AniList and identity-resolution work.
- Removed the second local `skip` slice that could empty later pages after AniList had already selected the requested page.
- Split catalog generation into focused modules to keep the serverless entrypoint maintainable.
- Prevented the fast catalog identity path from replacing a usable MAL identity with an unsupported `anilist:<id>` click-through identity.
- AniList-only catalog identities are resolved to supported external identities when a validated mapping exists; otherwise they are omitted instead of exposing an unsupported terminal ID.
- Added regression coverage for pagination, page size, supported identity fallback, and the Old Country Bumpkin-style failure mode.

## v3.36.0 release

- Added catalog-specific fast identity handling and existing identity validation improvements.
- Improved catalog search narrowing and external metadata identity handling.

## v3.35.0 release

- Pass Nuvio catalog search terms directly to AniList so searches do not require scanning the full seasonal catalog.
- Preserve the existing local title filter as a final compatibility check after AniList search narrowing.
- Added regression coverage for search variable propagation.

## v3.34.0 release

- Added backend pagination planning for seasonal catalogs using Nuvio's `skip` requests.
- Seasonal catalog requests without search now query only the corresponding AniList page instead of loading and canonicalizing the full catalog before slicing.
- Search requests progressively fetch only enough AniList pages to satisfy the requested Nuvio page.
- Added regression coverage for direct page selection and search pagination planning.

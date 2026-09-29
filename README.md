# Anime Releases for Nuvio — v3.39.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.39.0`
- **Production release:** `v3.38.0`
- **Latest production tag:** `v3.38.0`
- **Next minor release baseline:** `3.39.0`
- **Autonomous deployment checkpoint:** `0/5`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Catalog pagination:** Nuvio catalog pages are explicitly bounded to 10 items via the manifest `pageSize` extension; each Vercel serverless invocation processes only one requested page
- **Schedule pagination:** rolling 7-day catalogs walk AniList airing-event pages only until enough unique anime exist to fill the requested Nuvio page, avoiding under-filled pages caused by repeated episodes
- **Catalog search:** search terms are passed to AniList before canonicalization, avoiding full-season scans
- **Catalog identity:** seasonal catalogs use a fast AniBridge/Wikidata TVDB mapping path plus TVDB validation; supported downstream identities are required for Nuvio-facing catalog IDs, while AniList remains a source identity only
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unsupported AniList-only or MAL-only identities are not exposed as catalog click-through IDs

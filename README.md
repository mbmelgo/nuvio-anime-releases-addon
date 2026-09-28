# Anime Releases for Nuvio — v2.29.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.29.0`
- **Production release:** `v2.28.0`
- **Next minor release baseline:** `2.29.0`
- **Latest production tag:** `v2.28.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** AniSync-inspired multi-source MAL/AniList → Kitsu resolution
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a Kitsu mapping resolves to a TVDB series; otherwise the original `mal:` / `anilist:` identity is preserved
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Deployment checkpoint:** **2/5; next production deployment is authorized**.

The addon remains responsible for anime release and airing catalogs. AniList remains authoritative for airing dates, seasons, and upcoming episodes. Kitsu is used as the canonical anime identity layer. When a verified TVDB series mapping exists, the catalog exposes that TVDB identity because the current BingeCat integration can consume TVDB-based anime metadata; the Kitsu ID is retained in catalog metadata for downstream anime stream compatibility. Season-only or missing TVDB mappings never cause an item to be deleted: the original MAL/AniList identity is preserved.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

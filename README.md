# Anime Releases for Nuvio — v2.28.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `release/v2.28.0-retry`
- **Development version:** `2.28.0`
- **Production release:** `v2.27.2`
- **Next minor release baseline:** `2.28.0`
- **Latest production tag:** `v2.27.2`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity work:** AniSync-inspired multi-source MAL/AniList → Kitsu resolution with safe fallback to the original `mal:` / `anilist:` identity
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **Deployment checkpoint:** **0/5; active next autonomous cycle**.

The addon remains responsible for anime release and airing catalogs. Kitsu is used as a canonical identity layer without replacing AniList as the authority for airing dates, seasons, or upcoming episodes. Provider-specific IDs must never replace the catalog identity unless a canonical Kitsu mapping has been verified against the Kitsu title. If all mapping providers fail or a candidate mapping does not verify, the original MAL/AniList identity is preserved and the catalog item is never dropped.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

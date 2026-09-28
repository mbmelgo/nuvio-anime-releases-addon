# Anime Releases for Nuvio — v2.27.5

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `refactor/kitsu-canonicalization`
- **Development version:** `2.27.5`
- **Production release:** `v2.27.2`
- **Next minor release baseline:** `2.28.0`
- **Latest production tag:** `v2.27.2`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity work:** AniSync-inspired multi-source MAL/AniList → Kitsu resolution with safe fallback to the original `mal:` / `anilist:` identity
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **Deployment checkpoint:** **5/5; paused** until the next autonomous cycle is explicitly resumed.

The addon remains responsible for anime release and airing catalogs. This development iteration adds Kitsu as a canonical identity layer without replacing AniList as the authority for airing dates, seasons, or upcoming episodes. Provider-specific IDs must never replace the catalog identity unless a canonical Kitsu mapping has been verified. If all mapping providers fail, the original MAL/AniList identity is preserved and the catalog item is never dropped.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

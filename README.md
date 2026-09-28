# Anime Releases for Nuvio — v2.30.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.30.0`
- **Production release:** `v2.29.0`
- **Next minor release baseline:** `2.30.0`
- **Latest production tag:** `v2.29.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** AniSync-inspired multi-source MAL/AniList → Kitsu resolution
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a Kitsu mapping resolves to a TVDB series; for seasonal entries without their own TVDB series mapping, AniList PREQUEL/PARENT relations are traversed to locate a verified root/franchise TVDB series; otherwise the original `mal:` / `anilist:` identity is preserved
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Deployment checkpoint:** **4/5; one production deployment remains in this autonomous cycle**.

The addon remains responsible for anime release and airing catalogs. AniList remains authoritative for airing dates, seasons, and upcoming episodes. Kitsu is used as the canonical anime identity layer. When a verified TVDB series mapping exists, the catalog exposes that TVDB identity because the current BingeCat integration can consume TVDB-based anime metadata; the Kitsu ID is retained in catalog metadata for downstream anime stream compatibility. Seasonal entries that only have season-specific identities can fall back to the root series through AniList relations, preventing season IDs from being sent to BingeCat when only the franchise-level TVDB series is resolvable. Missing mappings never cause an item to be deleted: the original MAL/AniList identity is preserved.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

# Anime Releases for Nuvio — v3.8.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.8.1`
- **Production release:** `v3.8.0`
- **Next minor release baseline:** `3.9.0`
- **Latest production tag:** `v3.8.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; seasonal entries can traverse AniList PREQUEL/PARENT relationships to locate a verified root/franchise TVDB series; English, romaji, and native/Japanese title variants are compared during canonicalization; otherwise the original `mal:` / `anilist:` identity is preserved
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Catalog search:** all five catalogs advertise optional search and match English, romaji, and native/Japanese titles; Stremio catalog extra parameters are parsed from the protocol path, including `.json` on the final extra value and combined `search` + `skip` forms
- **Latest production fixes:** generalized Vercel routing resolves Upcoming Season Search/Discover HTTP 404 and supports combined Stremio catalog extras; exact-title Wikidata and TVDB web-search fallbacks recover verified TVDB series identities when provider-native mappings are unavailable, including object-shaped TVDB search results
- **Deployment checkpoint:** **5/5** for the current deployment cycle

The addon remains responsible for anime release, airing, and upcoming catalogs. AniList remains authoritative for airing dates, seasons, and upcoming episodes. Kitsu is used as the canonical anime identity layer. When a verified TVDB series mapping exists, the catalog exposes that TVDB identity because the current BingeCat integration can consume TVDB-based anime metadata. Seasonal entries that only have season-specific identities can fall back to a root series through AniList relations, preventing season IDs from being sent to BingeCat when only the franchise-level TVDB series is resolvable. Missing mappings never cause an item to be deleted: the original MAL/AniList identity is preserved.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

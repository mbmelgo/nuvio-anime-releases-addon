# Anime Releases for Nuvio — v3.48.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.48.0`
- **Production release:** `v3.47.0`
- **Previous production release:** `v3.46.0`
- **Next minor release baseline:** `3.48.0`
- **Autonomous deployment checkpoint:** `4/5` before v3.48.0 deployment

## v3.48.0 changes

- Temporarily exposes only the three seasonal anime catalogs: Upcoming Season, Current Season, and Previous Season.
- Hides Latest Anime and Upcoming Anime from Nuvio to eliminate schedule-catalog startup requests while the seasonal pipeline is optimized.
- Keeps Nuvio and AniList seasonal catalog pages aligned at 50 items.
- Seasonal pages use one AniList 50-item batch and return fewer than 50 when validation/deduplication leaves fewer results; they do not fetch additional AniList pages merely to fill the page.
- Removes per-title AniBridge/TVDB provider fallback from the seasonal critical path and relies on the batched supported-ID lookup.
- Adds regression coverage for seasonal-only catalog exposure, bounded pagination, and the fast identity path.

## Previous release

### v3.47.0

- Aligned Nuvio catalog pages with AniList at up to 50 items.
- Prevented seasonal catalogs from fetching additional AniList pages merely to fill a page after filtering or identity validation.
- Deduplicated Latest/Upcoming airing events within a single 50-event AniList batch without fill pagination.
- Reduced AniList request amplification and associated rate-limit pressure.
- Used validated BingeCat-compatible external identities with TMDB/IMDb preferred when multiple supported identities are available, while retaining validated TVDB fallback behavior.

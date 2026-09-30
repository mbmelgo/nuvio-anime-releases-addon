# Anime Releases for Nuvio — v3.49.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.49.1`
- **Production release:** `v3.47.0`
- **Previous production release:** `v3.46.0`
- **Release candidate:** `v3.48.1`
- **Autonomous deployment checkpoint:** `4/5` before this release

## v3.48.1 changes

- Temporarily exposes only the three seasonal anime catalogs: Upcoming Season, Current Season, and Previous Season.
- Hides Latest Anime and Upcoming Anime from Nuvio to eliminate schedule-catalog startup requests while the seasonal pipeline is optimized.
- Keeps Nuvio and AniList seasonal catalog pages aligned at 50 items.
- Seasonal pages use one AniList 50-item batch and return fewer than 50 when validation/deduplication leaves fewer results; they do not fetch additional AniList pages merely to fill the page.
- Uses the batched supported-ID lookup first, then recovers only unresolved seasonal entries through the existing validated TVDB fallback with bounded concurrency.
- Limits unresolved identity fallback concurrency to four to avoid recreating the previous per-title request burst.
- Preserves exact-series validation before accepting recovered TVDB identities.
- Adds regression coverage for seasonal-only catalog exposure, bounded pagination, supported identity recovery, and fallback concurrency.

## Production release request

v3.48.1 is ready for the controlled production deployment after CI verification.

## Previous release

### v3.47.0

- Aligned Nuvio catalog pages with AniList at up to 50 items.
- Prevented seasonal catalogs from fetching additional AniList pages merely to fill a page after filtering or identity validation.
- Deduplicated Latest/Upcoming airing events within a single 50-event AniList batch without fill pagination.
- Reduced AniList request amplification and associated rate-limit pressure.
- Used validated BingeCat-compatible external identities with TMDB/IMDb preferred when multiple supported identities are available, while retaining validated TVDB fallback behavior.

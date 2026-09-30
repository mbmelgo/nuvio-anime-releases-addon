# Anime Releases for Nuvio — v3.47.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.47.0`
- **Production release candidate:** `v3.47.0`
- **Previous production release:** `v3.46.0`
- **Next minor release baseline after deployment:** `3.48.0`
- **Autonomous deployment checkpoint:** `3/5` before v3.47.0 deployment

## v3.47.0 changes

- Aligns Nuvio catalog pages with AniList at up to 50 items.
- Prevents seasonal catalogs from fetching additional AniList pages merely to fill a page after filtering or identity validation.
- Deduplicates Latest/Upcoming airing events within a single 50-event AniList batch without fill pagination.
- Reduces AniList request amplification and associated rate-limit pressure.
- Uses validated BingeCat-compatible external identities with TMDB/IMDb preferred when multiple supported identities are available, while retaining validated TVDB fallback behavior.

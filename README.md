# Anime Releases for Nuvio — v3.49.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.49.1`
- **Production release:** `v3.48.1`
- **Release candidate:** `v3.49.1`
- **Autonomous deployment checkpoint:** `1/5`

## v3.49.1 changes

- Keeps only the three seasonal anime catalogs exposed to Nuvio while the release/airing catalogs remain disabled.
- Keeps seasonal catalog pagination aligned with the 50-item AniList batch model.
- Removes the per-title AniBridge/TVDB fallback from the seasonal catalog critical path.
- Fixes batched external-ID mapping so each AniList ID is matched to its own metadata regardless of input ordering.
- Seasonal identity resolution uses the batched supported external-ID lookup without creating dozens of provider requests for one catalog request.
- Preserves lower-level identity fallback code for non-seasonal/internal uses rather than deleting it prematurely.
- Adds regression coverage for seasonal critical-path fallback removal and AniList-ID mapping alignment.
- Reduces provider request amplification and targets the remaining seasonal initial-load latency.

## Production release request

v3.49.1 is ready for the controlled production deployment after CI verification.

## Previous production direction

### v3.48.1

- Temporarily exposed only the three seasonal anime catalogs.
- Used one AniList 50-item batch for seasonal pages without requesting additional AniList pages merely to fill the page.
- Used the batched supported-ID lookup first, then a bounded legacy TVDB fallback for unresolved titles.

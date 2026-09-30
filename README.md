# Anime Releases for Nuvio — v3.50.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.50.1`
- **Production release:** `v3.49.2`
- **Release candidate:** `v3.50.0`
- **Autonomous deployment checkpoint:** `1/5`

## v3.50.0 changes

- Sorts the seasonal AniList catalogs by AniList ID so the fixed 50-item upstream page is deterministic and includes the expected seasonal entries such as BLEACH when they fall within the first page.
- Keeps seasonal catalog pagination aligned with the 50-item AniList batch model without fetching additional pages merely to fill a Nuvio page.
- Keeps the seasonal critical path free of per-title AniBridge/TVDB fallback requests.
- Preserves the existing batched external-ID identity resolution and regression coverage.

## Production release request

v3.50.0 is ready for the controlled production deployment after CI verification.

## Previous production direction

### v3.49.2

- Seasonal catalog critical-path identity resolution uses a bounded batched Wikidata lookup rather than per-title provider fan-out.
- Temporarily exposed only the three seasonal anime catalogs.
- Used one AniList 50-item batch for seasonal pages without requesting additional AniList pages merely to fill the page.

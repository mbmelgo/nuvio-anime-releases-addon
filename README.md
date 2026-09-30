# Anime Releases for Nuvio — v3.51.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.51.0`
- **Production release:** `v3.50.0`
- **Release candidate:** `v3.51.0`
- **Autonomous deployment checkpoint:** `2/5`

## v3.51.0 changes

- Keeps the addon catalog resource type as `anime` while returning seasonal catalog items with `type: "series"` for Nuvio metadata routing.
- This preserves the correct TMDB IDs while allowing Nuvio to normalize the clicked item to its TV metadata path.
- Adds regression coverage for the Nuvio-compatible seasonal item type.
- Keeps seasonal AniList sorting by AniList ID and the bounded 50-item page model.

## Known investigation

- Some valid AniList seasonal entries are still being removed during batched external-ID identity resolution. BLEACH: Thousand-Year Blood War - The Calamity (AniList ID 185874) is a confirmed example requiring further identity-resolution investigation.
- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.

## Previous production direction

### v3.50.0

- Sorts the seasonal AniList catalogs by AniList ID so the fixed 50-item upstream page is deterministic.
- Keeps seasonal catalog pagination aligned with the 50-item AniList batch model without requesting additional AniList pages merely to fill a Nuvio page.
- Keeps the seasonal critical path free of per-title AniBridge/TVDB fallback requests.
- Preserves the existing batched external-ID identity resolution and regression coverage.

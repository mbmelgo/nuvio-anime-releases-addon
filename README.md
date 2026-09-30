# Anime Releases for Nuvio — v3.52.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.52.0`
- **Production release:** `v3.51.0`
- **Release candidate:** `v3.52.0`
- **Autonomous deployment checkpoint:** `3/5`

## v3.52.0 changes

- Seasonal AniList discovery now requests only the AniList ID from the upstream catalog query.
- The fixed 50-item AniList page is resolved through AniBridge using one batched `source.provider:anilist` + `source.id` lookup.
- AniBridge provides the supported downstream identity and the catalog preview metadata needed by Nuvio.
- Downstream identity preference remains TMDB, then IMDb, then TVDB.
- Adds regression coverage for BLEACH (AniList 185874), AniBridge batching, and ID-only AniList queries.
- Preserves the 50-item AniList/Nuvio pagination model and `type: "series"` seasonal items for Nuvio metadata routing.

## Known investigation

- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.
- BingeCat delegation remains dependent on validating the complete Nuvio click-through in production.

## Previous production direction

### v3.51.0

- Keeps the addon catalog resource type as `anime` while returning seasonal catalog items with `type: "series"` for Nuvio metadata routing.
- This preserves the correct TMDB IDs while allowing Nuvio to normalize the clicked item to its TV metadata path.
- Adds regression coverage for the Nuvio-compatible seasonal item type.
- Keeps seasonal AniList sorting by AniList ID and the bounded 50-item page model.

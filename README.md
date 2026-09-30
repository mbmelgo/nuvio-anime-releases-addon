# Anime Releases for Nuvio — v3.52.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.52.1`
- **Production release:** `v3.51.0`
- **Release candidate:** `v3.52.1`
- **Autonomous deployment checkpoint:** `4/5`

## v3.52.1 changes

- Seasonal AniList discovery requests only the AniList ID from the upstream catalog query.
- The fixed 50-item AniList page is resolved through AniBridge using one batched `source.provider:anilist` + `source.id` lookup.
- AniBridge provides the supported downstream identity and the catalog preview metadata needed by Nuvio.
- The resolver now uses the actual AniBridge mappings service host: `mappings.anibridge.eliasbenb.dev`.
- Downstream identity preference remains TMDB, then IMDb, then TVDB.
- Adds regression coverage for BLEACH (AniList 185874), AniBridge batching, the ID-only AniList query, and the production API host.
- Preserves the 50-item AniList/Nuvio pagination model and `type: "series"` seasonal items for Nuvio metadata routing.

## Known investigation

- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.
- BingeCat delegation remains dependent on validating the complete Nuvio click-through in production.
- A v3.52.0 production deployment was created successfully but its smoke test found the incorrect AniBridge host and therefore was not finalized as a release.

## Previous production direction

### v3.51.0

- Keeps the addon catalog resource type as `anime` while returning seasonal catalog items with `type: "series"` for Nuvio metadata routing.
- This preserves the correct TMDB IDs while allowing Nuvio to normalize the clicked item to its TV metadata path.
- Adds regression coverage for the Nuvio-compatible seasonal item type.
- Keeps seasonal AniList sorting by AniList ID and the bounded 50-item page model.

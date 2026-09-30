# Anime Releases for Nuvio — v3.52.2

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.52.2`
- **Production release:** `v3.51.0`
- **Release candidate:** `v3.52.2`
- **Autonomous deployment checkpoint:** `4/5`

## v3.52.2 changes

- Seasonal AniList discovery continues to request only the AniList ID from the upstream catalog query.
- Each AniList ID is now resolved through the documented AniBridge v3 mappings endpoint: `mappings.anibridge.eliasbenb.dev/api/v3/mappings?provider=anilist&id=<id>`.
- AniBridge v3 responses are normalized to the supported downstream identities: TMDB, IMDb, and TVDB.
- AniBridge season suffixes are parsed without incorrectly treating them as part of the provider ID.
- The catalog can construct a minimal Nuvio series meta from AniBridge identity data alone; AniList title/cover metadata is no longer required for the identity lookup.
- Adds regression coverage for the actual Bleach (AniList 185874) v3 response shape, per-ID requests, partial lookup failures, and ID-only catalog metas.
- Preserves the 50-item AniList/Nuvio pagination model and `type: "series"` seasonal items for Nuvio metadata routing.

## Known investigation

- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.
- BingeCat delegation remains dependent on validating the complete Nuvio click-through in production.
- The previous v3.52.1 production smoke test failed because the addon was using the wrong AniBridge API contract. The correct v3 endpoint has now been verified manually against AniList ID 185874.

## Previous production direction

### v3.51.0

- Keeps the addon catalog resource type as `anime` while returning seasonal catalog items with `type: "series"` for Nuvio metadata routing.
- This preserves the correct TMDB IDs while allowing Nuvio to normalize the clicked item to its TV metadata path.
- Adds regression coverage for the Nuvio-compatible seasonal item type.
- Keeps seasonal AniList sorting by AniList ID and the bounded 50-item page model.

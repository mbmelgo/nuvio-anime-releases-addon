# Anime Releases for Nuvio — v3.52.3

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.52.3`
- **Production release:** `v3.51.0`
- **Release candidate:** `v3.52.3`
- **Autonomous deployment checkpoint:** `4/5`

## v3.52.3 changes

- Keeps seasonal AniList discovery ID-only and AniBridge v3 identity resolution.
- Corrects regression coverage for numeric IDs with no AniBridge mapping while continuing to ignore invalid IDs.
- Preserves the bounded per-ID AniBridge lookup and partial-failure behavior.

## Known investigation

- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.
- BingeCat delegation remains dependent on validating the complete Nuvio click-through in production.
- The previous v3.52.1 production smoke test failed because the addon was using the wrong AniBridge API contract. The correct v3 endpoint has now been verified manually against AniList ID 185874.

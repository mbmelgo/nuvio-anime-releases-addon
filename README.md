# Anime Releases for Nuvio — v3.53.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.53.0`
- **Production release:** `v3.52.4`
- **Release candidate:** `v3.53.0`
- **Autonomous deployment checkpoint:** `0/5` (cycle resumed)

## v3.53.0 changes

- Restores the minimal AniList preview metadata required for correct Nuvio catalog cards.
- Keeps seasonal AniList discovery at 50-item pagination and AniBridge v3 identity resolution.
- Preserves bounded per-ID AniBridge lookup and partial-failure behavior.
- Provides Nuvio-facing title and poster fields instead of ID-only catalog previews.

## Known investigation

- Latest Anime and Upcoming Anime remain hidden while the seasonal pipeline is being stabilized.
- BingeCat delegation remains dependent on validating the complete Nuvio click-through in production.

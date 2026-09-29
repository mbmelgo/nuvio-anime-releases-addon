# Anime Releases for Nuvio — v3.31.2

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.31.2`
- **Production release:** `v3.31.0`
- **Latest production tag:** `v3.31.0`
- **Next minor release baseline:** `3.32.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; validated IMDb/TMDB identities are used as BingeCat-compatible fallbacks; unresolved identities retain their source ID until a verified mapping is available
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Identity matching:** English, romaji, native/Japanese, alias, continuation, season, and root-title evidence are considered; season-marked titles can also use their canonical root-title variant for external TMDB/IMDb recovery
- **Provider resilience:** AniList 429 responses honor `Retry-After` and retry with bounded backoff; unresolved canonical identities use a short negative-cache window so transient provider misses can be retried instead of persisting for an hour

## v3.31.1 development change

- Generalized season-title external identity fallback: season-marked titles can recover verified TMDB/IMDb identities from their root title through Wikidata.
- Added regression coverage for numeric and Roman-numeral season markers.

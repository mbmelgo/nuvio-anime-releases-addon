# Anime Releases for Nuvio — v3.18.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.18.0`
- **Production release:** `v3.18.0`
- **Latest production tag:** `v3.18.0`
- **Next minor release baseline:** `3.19.0`
- **Architecture:** **catalog-only**
- **Catalog source:** AniList release/airing data
- **Canonical identity:** multi-source MAL/AniList → Kitsu resolution with TVDB mapping when verified
- **Nuvio-facing identity:** verified `tvdb:<seriesId>` when a canonical TVDB mapping is available; seasonal entries can traverse AniList PREQUEL/PARENT relationships to locate a verified root/franchise TVDB series; English, romaji, and native/Japanese title variants are compared during canonicalization; otherwise the original `mal:` / `anilist:` identity is preserved
- **Canonicalization implementation:** split into serverless-safe modules under `lib/`, while `lib/kitsu-canonical.js` remains the stable compatibility entry point
- **Metadata:** delegated to **BingeCat / the configured metadata addon**
- **Catalog search:** all five catalogs advertise optional search support and match English, romaji, and native/Japanese titles; Stremio catalog extra parameters are parsed from the protocol path, including `.json` on the final extra value and combined `search` + `skip` forms
- **Identity validation:** TVDB candidates are validated against title, year, continuation/season evidence, and provider identity evidence before being exposed to Nuvio; continuing TVDB series can represent later seasons when the base title matches, without collapsing unrelated franchise entries or reboot identities
- **Title display priority:** English → Romaji → native/Japanese, while identity matching continues to consider all supported title variants and aliases
- **Recent fixes:** v3.18.0 improves TVDB candidate validation; improves fallback handling for unresolved MAL/AniList identities; recovers later seasons such as Ranma 1/2 Season 3 from continuing TVDB series; prevents generic wording such as “The Series” from being mistaken for a season marker; and preserves reboot/franchise separation such as Pokémon Horizons and Keroro Gunsou
- **Deployment checkpoint:** **5/5** for the current autonomous cycle

The addon remains responsible for anime release, airing, and upcoming catalogs. AniList remains authoritative for airing dates, seasons, and upcoming episodes. Kitsu is used as the canonical anime identity layer. When a verified TVDB series mapping exists, the catalog exposes that TVDB identity because the current BingeCat integration can consume TVDB-based anime metadata. Seasonal entries that only have season-specific identities can fall back to a root series through AniList relations, preventing season IDs from being sent to BingeCat when only the franchise-level TVDB series is resolvable. Missing mappings never cause an item to be deleted: the original MAL/AniList identity is preserved.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

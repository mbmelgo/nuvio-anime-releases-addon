# Anime Releases for Nuvio — v3.54.2

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.54.2`
- **Production release:** `v3.54.2`
- **Autonomous deployment checkpoint:** `1/10` for this iteration only

## v3.54.2 changes

- Uses AniList as the canonical anime identity source.
- Uses `anilist:<id>` identities directly; no AniBridge mapping is required.
- Keeps Nuvio pagination aligned with AniList's 50-item pages.
- Preserves Nuvio catalog metadata such as title, poster, genres, and release information.
- Delegates detailed anime metadata to the user's preferred metadata addon.
- Production validation confirmed Spring 2026 (54), Summer 2026 (52), and Fall 2026 (57) seasonal catalog counts in Nuvio.

## Architecture

```text
AniList → anilist:<id> → Nuvio → preferred metadata addon
```

The addon is intentionally focused on seasonal release/airing catalogs rather than duplicating a metadata provider's identity-resolution system.

## Production validation

The AniList-only path was validated end-to-end in Nuvio. Seasonal catalog completeness, pagination, canonical AniList identities, and metadata resolution were verified. Some individual AIOMetadata lookups can still fail independently of the addon when the upstream metadata provider returns an error or null response.

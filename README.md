# Anime Releases for Nuvio — v3.55.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Production:** `v3.55.0`
- **Identity:** AniList-only, using `anilist:<id>` as the canonical catalog identity
- **Catalogs:** Upcoming, Current, and Previous Season
- **Pagination:** 50 AniList items per page, aligned with Nuvio pagination
- **Metadata:** delegated to the configured metadata addon
- **Deployment checkpoint:** `2/10` for this autonomous iteration
- **CI:** PR CI plus the main release pipeline; redundant post-release verification workflow removed

## v3.55.0 release

- Removed the optional AniBridge compatibility architecture from production.
- Removed obsolete provider-resolution and mapping code/tests that were no longer part of the production catalog path.
- Kept the catalog focused on AniList release/airing discovery and Nuvio-compatible presentation.
- Production Nuvio validation confirmed:
  - Spring 2026: **54** anime
  - Summer 2026: **52** anime
  - Fall 2026: **57** anime
  - fast initial loading and pagination
  - canonical `anilist:<id>` identities
  - successful metadata resolution for representative anime including AniList `195604` and `205896`

## Architecture

```text
AniList → anilist:<id> → Nuvio → metadata addon
```

The addon is intentionally a release/airing catalog rather than a duplicate metadata provider. Detailed anime metadata remains the responsibility of the configured metadata addon.

## Catalogs

The production manifest exposes exactly three seasonal catalogs:

- Upcoming Season
- Current Season
- Previous Season

Catalog pages follow AniList's 50-item page size so Nuvio can request additional pages directly.

## Known external behavior

Some individual metadata lookups can still fail when the upstream metadata provider returns an error or `null`. Those failures are outside the catalog identity path and should not be worked around by reintroducing provider-mapping logic into this addon.

## Release workflow

Production releases require passing CI, then a controlled Vercel deployment and production smoke test. Release tags use `vMAJOR.MINOR.PATCH`; production deployments increment the minor version and ordinary meaningful changes increment the patch version.

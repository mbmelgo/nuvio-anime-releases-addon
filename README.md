# Anime Releases for Nuvio — v3.56.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Production:** `v3.56.0`
- **Identity:** AniList-only, using `anilist:<id>` as the canonical catalog identity
- **Catalogs:** Upcoming, Current, and Previous Season
- **Pagination:** 50 AniList items per page, aligned with Nuvio pagination
- **Metadata:** delegated to the configured metadata addon
- **Deployment checkpoint:** `3/10` for this autonomous iteration
- **CI:** PR CI plus the main release pipeline; redundant post-release verification workflow removed

## v3.56.0 release

- Removed the remaining unused provider-resolution, mapping, schedule, and rate-limit resources from the active repository.
- Removed tests that only covered the retired provider-resolution architecture.
- Simplified catalog metadata construction to the active AniList identity path.
- Updated the Vercel landing page to expose only the production AniList-only manifest.
- Production Nuvio validation remains confirmed:
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

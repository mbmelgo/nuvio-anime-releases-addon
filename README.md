# Anime Releases for Nuvio — v3.58.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Production release:** `v3.58.0`
- **Identity:** AniList-only, using `anilist:<id>` as the canonical catalog identity
- **Catalogs:** Upcoming, Current, and Previous Season
- **Seasonal query:** AniList `ANIME` entries in `TV`, `TV_SHORT`, `ONA`, `OVA`, `SPECIAL`, and `MOVIE` formats, with no status restriction
- **Pagination:** 50 AniList items per page, aligned with Nuvio pagination
- **Metadata:** delegated to the configured metadata addon
- **Deployment checkpoint:** `4/10` before this release; this deployment will be `5/10`
- **CI:** PR CI plus the main release pipeline; redundant post-release verification workflow removed

## v3.58.0 changes

- Updated the Vercel landing page with the current AniList-only architecture and seasonal catalog baselines.
- Production landing page now reports Spring 2026: **99**, Summer 2026: **105**, Fall 2026: **94**.
- The seasonal query includes `TV`, `TV_SHORT`, `ONA`, `OVA`, `SPECIAL`, and `MOVIE` formats with no status restriction.

## v3.57.0 changes

- Expanded all seasonal catalogs to match AniList's seasonal anime search across the six anime formats used by the website.
- Removed the `NOT_YET_RELEASED` status restriction so anime remain in their seasonal catalog as their status changes from upcoming to releasing and finished.
- Spring 2026 diagnostic baseline: **99** anime.
- Summer 2026 diagnostic baseline: **105** anime.
- Fall 2026 diagnostic baseline: **94** anime, matching the equivalent AniList website search.
- Preserved the existing 50-item AniList/Nuvio pagination model.

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

All three use the same AniList query constraints and differ only by the requested season.

Catalog pages follow AniList's 50-item page size so Nuvio can request additional pages directly.

## Known external behavior

Some individual metadata lookups can still fail when the upstream metadata provider returns an error or `null`. Those failures are outside the catalog identity path and should not be worked around by reintroducing provider-mapping logic into this addon.

## Release workflow

Production releases require passing CI, then a controlled Vercel deployment and production smoke test. Release tags use `vMAJOR.MINOR.PATCH`; production deployments increment the minor version and ordinary meaningful changes increment the patch version.

# Anime Releases for Nuvio — v2.22.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.22.1`
- **Production release:** `v2.21.0` → **releasing `v2.22.0`**
- **Next minor release baseline:** `2.22.0`
- **Latest production tag:** `v2.21.0`
- **Architecture:** **catalog-only**
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **CI status:** **green** for the release candidate
- **Deployment checkpoint:** **4/5** before this release; this release is the final authorized deployment **#5/5** in the current autonomous cycle.

The addon is intentionally responsible only for anime release and airing catalogs. Detailed metadata is delegated to BingeCat rather than duplicated inside this addon. Legacy metadata routes and the old local metadata resolver have been retired.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

## URLs

- GitHub: https://github.com/mbmelgo/nuvio-anime-releases-addon
- Vercel: https://nuvio-anime-releases-addon-rho.vercel.app
- Production manifest: https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- Installer home: https://nuvio-anime-releases-addon-rho.vercel.app/

## Supported catalogs

The addon exposes exactly five catalogs. Seasonal catalogs are generated dynamically from the current date, so they automatically move from one season/year to the next. The latest/upcoming episode catalogs use rolling seven-day windows and are cached for up to one hour.

| Catalog | Production URL | Purpose |
|---|---|---|
| **Upcoming Season** | https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/upcoming_season.json | Anime scheduled for the next season |
| **Current Season** | https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/current_season.json | Anime in the current season |
| **Previous Season** | https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/previous_season.json | Anime from the immediately preceding season |
| **Latest Anime — Last 7 Days** | https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/new_episodes.json | Anime with episodes released within the rolling last 7 days |
| **Upcoming Anime — Next 7 Days** | https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/upcoming_episodes.json | Anime with episodes scheduled within the rolling next 7 days |

Each catalog is returned as a single response containing up to **1,000 anime**, so Nuvio does not need client-side pagination for the addon. AniList's smaller provider pages are aggregated internally before the response is returned, and large external-ID mappings are batched before metadata delegation.

The unversioned `/...` URLs are the **canonical production URLs**. There is no separate public v4/v5 route namespace.

## Resolver architecture

```text
AniList
   ↓
Season / airing catalog generation
   ↓
MAL / AniList identity
   ↓
IMDb / TMDB / TVDB compatibility mapping
   ↓
Nuvio catalog
   ↓
BingeCat / configured metadata addon
   ↓
Detailed anime metadata
```

The root manifest is the recommended installation URL. The addon does not provide detailed metadata itself and intentionally does not expose public `/meta` routes.

## Metadata delegation

Catalog entries are translated to compatible IMDb/TMDB/TVDB identities when available. For later-season entries, the mapper checks related original/prequel anime metadata, then AniZip mappings, then original/base-name candidates with seasonal suffixes removed. Ambiguous name-only mappings are rejected rather than guessed. This allows BingeCat to resolve the franchise identity without maintaining a duplicate metadata resolver in this project.

Unmapped entries retain their original MAL/AniList identity rather than being assigned an unsupported or guessed ID.

## Regression coverage

- Franchise continuation and original/root-series identity
- Later-season and seasonal-title mapping
- Ambiguous external-name mapping protection
- Roman-numeral and numbered season handling
- Episode identity normalization and reconciliation
- Special/recap/OVA/ONA/movie filtering
- Upcoming and recently aired episode windows
- Exact rolling seven-day catalog boundaries
- Dynamic previous/current/upcoming season calculation
- Single-page catalog responses up to 1,000 anime
- Batched external-ID mapping for large catalog responses
- IMDb/TMDB/TVDB identity delegation
- Catalog-only routing with legacy metadata endpoints disabled
- Short manifest caching for prompt seasonal catalog discovery

## Performance

The catalog resolver uses bounded provider lookups and caching to keep seasonal catalog generation practical for Vercel. Seasonal and rolling catalogs aggregate AniList's 50-item provider pages internally, up to a maximum of 1,000 catalog entries. External metadata identity lookups are batched in bounded groups before delegation. Rolling episode catalogs are cached for up to one hour so the list can refresh hourly while never searching outside its seven-day window. The manifest uses a short client/CDN cache so newly available seasonal catalogs can be discovered promptly.

## Data sources

AniList is the primary source for anime release, season/status, artwork, scores, airing schedules, franchise relationships, and external links. AniZip and other compatibility sources provide cross-database mappings and fallbacks. Wikidata is used only as a constrained cross-database fallback when a compatible identity cannot be obtained from primary mappings.

## Release workflow

```text
Requirement / bug
    ↓
Regression test
    ↓
Generalized implementation
    ↓
npm test / GitHub Actions
    ↓
CI GREEN
    ↓
Controlled Vercel production deployment
    ↓
Production smoke test
    ↓
Annotated minor release tag
    ↓
Release-state update
```

Production deployment requires the `[deploy-prod]` commit marker and a matching `nextReleaseVersion` in `ops/release-state.json`. Automatic Vercel Git deployments remain disabled.

## Versioning

- Patch (`2.21.x`): development commits/changes.
- Minor (`2.x.0`): every production deployment.
- Major (`x.0.0`): manual architectural/breaking-release decision.

Minor and major releases receive annotated Git tags with human-readable change summaries. Ordinary patch commits are not tagged.

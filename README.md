# Anime Releases for Nuvio — v2.18.25

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.18.25` (patch version is automatically advanced by CI for development commits)
- **Production release:** `v2.18.0`
- **Next minor release baseline:** `2.19.0`
- **Latest production tag:** `v2.18.0`
- **Production resolver:** **v5**
- **Architecture:** **catalog-only**
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **CI status:** **green**
- **Deployment checkpoint:** **5/5 — PAUSED**

The addon is now intentionally responsible only for anime release, airing, seasonal, and ranking catalogs. Detailed metadata is delegated to BingeCat rather than being duplicated inside this addon. Legacy metadata routes and the old local metadata resolver have been retired.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook. Production deployment #6 requires explicit authorization because the current internal checkpoint is 5/5.

## URLs

- GitHub: https://github.com/mbmelgo/nuvio-anime-releases-addon
- Vercel: https://nuvio-anime-releases-addon-rho.vercel.app
- Production manifest: https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- Installer home: https://nuvio-anime-releases-addon-rho.vercel.app/

## Supported catalogs

All catalogs are generated dynamically from the current date and AniList data. Seasonal names therefore move automatically from one year/season to the next; no annual catalog rewrite is required.

| Catalog | Production URL | Purpose |
|---|---|---|
| **Ongoing** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/ongoing.json | Currently releasing anime from the current and previous season |
| **Airing Today** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/airing_today.json | Anime with an episode airing today in Asia/Manila time |
| **New Episodes — Last 7 Days** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/new_episodes.json | Anime with recently aired episodes |
| **Next Episodes — Next 7 Days** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/next_episodes.json | Anime with scheduled episodes in the next 7 days |
| **Upcoming** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/upcoming.json | Not-yet-released anime in the next season |
| **Finished — Current Season** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/finished_current.json | Anime that finished during the current season |
| **Previous Season** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/previous_season.json | Anime from the immediately preceding season |
| **Popular — Current Season** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/popular_current.json | Current-season anime ordered by popularity |
| **Top Rated — Current Season** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/top_rated_current.json | Current-season anime ordered by score |
| **Trending — Current Season** | https://nuvio-anime-releases-addon-rho.vercel.app/v5/catalog/series/trending_current.json | Current-season anime ordered by AniList trending score |

The explicit `/v5/...` URLs above are the preferred direct catalog URLs for testing. Equivalent `/catalog/series/...` routes remain available through the Vercel compatibility rewrite.

## Resolver architecture

```text
AniList
   ↓
Season-aware catalog generation
   ↓
MAL/AniList identity
   ↓
IMDb/TMDB/TVDB compatibility mapping
   ↓
Nuvio catalog
   ↓
BingeCat / configured metadata addon
   ↓
Detailed anime metadata
```

The root manifest is the recommended installation URL. The addon does not provide detailed metadata itself and intentionally does not expose public `/meta` routes.

## Metadata delegation

Seasonal catalog entries are dynamically resolved and their MAL/AniList identities are translated to compatible IMDb/TMDB/TVDB identities when available. For later-season entries, the mapper checks related original/prequel anime metadata, then AniZip maintained cross-database mappings, then original/base-name candidates with seasonal suffixes removed. This allows BingeCat to resolve the franchise identity without maintaining a duplicate metadata resolver in this project.

Unmapped entries retain their original MAL/AniList identity rather than being assigned an unsupported or guessed ID.

## Resolver behavior covered by regression tests

- Franchise continuation detection, including parent-side sequel relationships
- Root-series identity when a later seasonal entry is requested
- Recovery of an unmarked earlier season from later-season requests
- `Final Season` continuation handling
- Roman-numeral season markers `II` through `X`
- Protection against treating ordinary standalone `I` as a season marker
- Long-running anime without an arbitrary 100-episode ceiling
- Episode ID uniqueness and normalization
- Episode sequence reconciliation across sources
- Special/recap/OVA/ONA/movie filtering
- Finished-series primary-source selection
- Ongoing-series freshness fallback
- Upcoming episode preservation with scheduled release dates
- Original/base-name matching for seasonal titles
- IMDb/TMDB/TVDB identity delegation
- Catalog-only routing with legacy metadata endpoints disabled

## Performance

The catalog resolver uses bounded provider lookups and caching to keep seasonal catalog generation practical for Vercel. Mapping work is performed only for catalog identities that need compatibility translation.

Performance optimization remains a secondary priority while functional correctness and robustness are being finalized.

## Data sources

AniList is the primary source for anime release, season/status, artwork, scores, popularity, airing schedules, franchise relationships, and external links. Jikan and AniZip provide MAL mappings, episode data, broadcast/provider information, and fallbacks. Wikidata provides an additional cross-database fallback when a compatible identity cannot be obtained from the primary mapping sources. TVMaze is limited to freshness supplementation for ongoing long-running series.

## Release workflow

```text
Requirement / bug
    ↓
Regression test
    ↓
Implementation
    ↓
npm test / GitHub Actions
    ↓
FAIL → fix; no deployment
    ↓
PASS
    ↓
Batch related production-ready changes
    ↓
Version verification / release documentation
    ↓
[deploy-prod]
    ↓
Deployment checkpoint
    ├── < 5 → production deployment
    └── 5 → PAUSE
    ↓
Live validation
    ↓
Minor release tag
```

The deployment checkpoint is stored in `ops/release-state.json`.

### Versioning

- Every source commit increments the patch version during normal development.
- Each successful production deployment creates a minor release baseline.
- Major releases are manually decided.
- Minor and major releases receive annotated Git tags with human-readable change summaries.
- The historical `v2.16.0` tag was intentionally left uncreated per project decision; existing release tags were not otherwise rewritten.
- Production release tags are created by the marker-gated GitHub Actions workflow.

## Key endpoints

```text
/                         Installer home page
/manifest.json            Production v5 catalog-only addon manifest
/v5/manifest.json         Explicit v5 catalog-only manifest
/catalog/series/:id.json  Production series catalog
/v5/catalog/series/:id.json Explicit v5 series catalog
```

There are intentionally no public `/meta` routes in the production Vercel configuration.

## Streams

This is a **catalog addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

# Anime Releases for Nuvio — v2.14.0

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.14.0`
- **Release candidate:** `2.13.0`
- **Latest production release:** `v2.12.0`
- **Latest production source commit:** `2fd117a9bccad9cc49d1cdbda627432abe274709`
- **Production resolver:** **v5**
- **Legacy resolver:** **v4**, retained for side-by-side validation
- **Active deployment checkpoint:** **1/5**
- **Total production deployments:** **16**
- **CI status for this release candidate:** **38/38 tests passing**

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated: normal commits run CI without deploying; `[deploy-prod]` is used only after CI passes and the deployment is worth consuming one checkpoint slot.

## URLs

- GitHub: https://github.com/mbmelgo/nuvio-anime-releases-addon
- Vercel: https://nuvio-anime-releases-addon-rho.vercel.app
- Production manifest: https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- Resolver selector: https://nuvio-anime-releases-addon-rho.vercel.app/
- v4 manifest: https://nuvio-anime-releases-addon-rho.vercel.app/v4/manifest.json
- v5 manifest: https://nuvio-anime-releases-addon-rho.vercel.app/v5/manifest.json

## Resolver architecture

```text
/manifest.json
    ↓
  v5 production resolver

/meta/series/:id.json
    ↓
  v5 production resolver

/api/meta/series/:id.json
    ↓
  v5 compatibility route

/v4/...
    ↓
  v4 legacy resolver
```

The landing page provides a resolver selector so v4 and v5 can be installed and tested independently.

## Resolver behavior covered by regression tests

- Franchise continuation detection, including parent-side sequel relationships
- `Final Season` continuation handling
- Roman-numeral season markers `II` through `X`
- Protection against treating ordinary standalone `I` as a season marker
- Long-running anime without an arbitrary 100-episode ceiling
- Episode ID uniqueness and normalization
- Episode sequence reconciliation across sources
- Special/recap/OVA/ONA/movie filtering
- Finished-series primary-source selection
- Ongoing-series freshness fallback
- v4/v5 manifest selection and production routing
- Rich series metadata including release information, country, cast, trailers, and season/episode presentation data

## Data sources

AniList is the primary source for metadata, season/status information, artwork, scores, popularity, airing schedules, and franchise relationships. Jikan and AniZip provide MAL mappings, episode data, and fallbacks. TVMaze is limited to freshness supplementation for ongoing long-running series.

## Release workflow

```text
GitHub commit
    ↓
npm test
    ↓
FAIL → stop; no production deployment
    ↓
PASS
    ↓
[deploy-prod]?
    ├── No → continue development
    └── Yes → deployment checkpoint
                 ├── < 5 → production deployment
                 └── 5 → PAUSE
```

The deployment checkpoint is stored in `ops/release-state.json`.

### Versioning

- Every source commit increments the patch version during normal development.
- Each successful production deployment is a minor release baseline (`2.12.0 → 2.13.0 → 2.14.0`), while the deployed source may carry the current patch version within that baseline.
- After deployment, development advances to the next minor baseline for subsequent patch commits.
- Major releases are manually decided.
- Minor and major releases receive annotated Git tags with human-readable change summaries.

## Key endpoints

```text
/                         Resolver selection home page
/manifest.json            Production v5 addon manifest
/v4/manifest.json         Explicit v4 addon manifest
/v5/manifest.json         Explicit v5 addon manifest
/catalog/series/:id.json  Production series catalog
/meta/series/:id.json     Production v5 series metadata
/v4/meta/series/:id.json Explicit v4 metadata
/v5/meta/series/:id.json Explicit v5 metadata
/api/meta/series/:id.json v5 metadata compatibility route
```

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

## Release state

The latest production deployment is `v2.12.0`, sourced from commit `2fd117a9bccad9cc49d1cdbda627432abe274709`. The current development/release-candidate line is `2.14.0`; it contains the accumulated rich-metadata changes and is pending the next production deployment.

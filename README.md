# Anime Releases for Nuvio — v2.16.6

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.16.6`
- **Next minor release baseline:** `2.16.0`
- **Latest production tag (pending correction):** `v2.15.4`
- **Latest production source commit:** `cc9ea9cff4b5e7bf70985f3dedbbea751e88c5e6`
- **Latest production source version:** `2.15.4`
- **Production resolver:** **v5**
- **Legacy resolver:** **v4**, retained for side-by-side validation
- **Active deployment checkpoint:** **4/5**
- **Total production deployments:** **19**
- **CI status for rich metadata changes:** **green**

The current production source is being corrected from the erroneous patch-level tag `v2.15.4` to the required minor release baseline `v2.15.0`. No older release tags are being rewritten or backfilled.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated: normal commits run CI without deploying; `[deploy-prod]` is used only after CI passes and the deployment is worth consuming one checkpoint slot.

## Production validation target

The latest controlled production deployment validated the rich-metadata semantic fixes: streaming episodes are no longer exposed as trailers, producer companies are separated from broadcast-network metadata, and release/last-air dates aggregate across resolved seasons and episode dates.

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
  v5 rich metadata resolver

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
- Rich series metadata including release information, country, language, certification, background art, networks, studios, cast, trailers, recommendations, external links, and season/episode presentation data

## Data sources

AniList is the primary source for metadata, season/status information, artwork, scores, popularity, airing schedules, franchise relationships, cast, studios, trailers, recommendations, and external links. Jikan and AniZip provide MAL mappings, episode data, broadcast/provider information, and fallbacks. TVMaze is limited to freshness supplementation for ongoing long-running series.

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
- Each successful production deployment creates a minor release baseline (`2.13.0 → 2.14.0 → 2.15.0`); the deployed source may carry the current patch version within that baseline.
- After deployment, development advances to the next minor baseline for subsequent patch commits.
- Major releases are manually decided.
- Minor and major releases receive annotated Git tags with human-readable change summaries.
- No historical tag backfill is performed unless explicitly requested.

## Key endpoints

```text
/                         Resolver selection home page
/manifest.json            Production v5 addon manifest
/v4/manifest.json         Explicit v4 addon manifest
/v5/manifest.json         Explicit v5 addon manifest
/catalog/series/:id.json  Production series catalog
/meta/series/:id.json     Production v5 rich series metadata
/v4/meta/series/:id.json Explicit v4 metadata
/v5/meta/series/:id.json Explicit v5 metadata
/api/meta/series/:id.json v5 metadata compatibility route
```

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

## Release state

The latest production deployment is source version `2.15.4` from commit `cc9ea9cff4b5e7bf70985f3dedbbea751e88c5e6`. The active deployment checkpoint is 4/5. The patch-level deployment tag is being corrected to `v2.15.0` for this release baseline.

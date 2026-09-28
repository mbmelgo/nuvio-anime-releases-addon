# Anime Releases for Nuvio — v2.16.16

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.16.16`
- **Next minor release baseline:** `2.17.0`
- **Latest production tag:** `v2.16.0`
- **Latest production source commit:** `55d371580ee8a20dc0f25e5bd5102c5a333da630`
- **Latest production source version:** `2.16.10`
- **Latest production deployment:** `dpl_DVzT6p2jrMheaNVsyrtCgDJkRBZF`
- **Production resolver:** **v5**
- **Legacy resolver:** **v4**, retained for side-by-side validation
- **Active deployment checkpoint:** **5/5 — PAUSED**
- **Total production deployments:** **20**
- **CI status:** **green**

The fifth production deployment has been completed and the autonomous deployment checkpoint is intentionally paused. No additional production deployment should be made until the user explicitly resumes the loop.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

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

## Rich metadata

The production v5 metadata resolver currently exposes, when provider data is available:

- Release range and last-air date
- Airing status and runtime
- Country and language
- Certification / age rating
- Background/banner artwork
- Season-specific posters
- Broadcast/network information
- Studios and producers
- Cast, characters, voice actors, and cast images
- Actual trailers, separate from streaming episodes
- Streaming-episode metadata under `app_extras.streamingEpisodes`
- Recommendations / related anime
- External links
- Season and episode presentation metadata

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
- Each successful production deployment creates a minor release baseline (`2.14.0 → 2.15.0 → 2.16.0`); the deployed source may carry the current patch version within that baseline.
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

The fifth production deployment is source version `2.16.10` from commit `55d371580ee8a20dc0f25e5bd5102c5a333da630`, with production deployment ID `dpl_DVzT6p2jrMheaNVsyrtCgDJkRBZF`. The release baseline is `v2.16.0`. The autonomous deployment checkpoint is **5/5 and paused**; the next development minor baseline is `2.17.0`.

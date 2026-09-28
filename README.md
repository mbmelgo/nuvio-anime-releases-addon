# Anime Releases for Nuvio — v2.17.2

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.17.2`
- **Next minor release baseline:** `2.17.0`
- **Latest production tag:** `v2.16.0`
- **Production resolver:** **v5**
- **Legacy resolver:** **retired**
- **CI status:** **green**

The production addon now uses a single v5 resolver. The former v4 implementation and side-by-side resolver selector have been removed to reduce maintenance and routing complexity.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

## URLs

- GitHub: https://github.com/mbmelgo/nuvio-anime-releases-addon
- Vercel: https://nuvio-anime-releases-addon-rho.vercel.app
- Production manifest: https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- Installer home: https://nuvio-anime-releases-addon-rho.vercel.app/

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

/catalog/series/:id.json
    ↓
  shared catalog resolver
```

The root manifest is the recommended installation URL. The explicit `/v5/...` routes remain available for compatibility/testing, but there is no longer a v4 resolver.

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
- Rich series metadata including release information, country, language, certification, background art, networks, studios, cast, trailers, recommendations, external links, and season/episode presentation data

## Rich metadata

The production v5 metadata resolver currently exposes, when provider data is available:

- Root/original series title and description for seasonal requests
- Root-series artwork and genres where available
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
- Upcoming episodes from the provider airing schedule, merged with existing episode data and exposed with future `released` dates so compatible clients can display scheduled/unavailable episode cards
- Recommendations / related anime
- IMDb ID for client-side IMDb metadata enrichment, including a fallback from resolved episode-source identities when Jikan lacks an IMDb external link
- External links
- Season and episode presentation metadata

Season-specific episode and airing data remains available while the primary series identity comes from the franchise root.

## Performance

The v5 rich metadata path is optimized to avoid repeating the expensive base resolver work. The rich layer reuses the resolved franchise graph and season groups instead of resolving the same MAL graph a second time. Franchise graph discovery is performed in bounded parallel batches, while provider caching remains enabled with Vercel-friendly `s-maxage`/stale-while-revalidate headers.

Performance optimization remains a secondary priority while functional correctness and robustness are being finalized.

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
- Each successful production deployment creates a minor release baseline.
- Major releases are manually decided.
- Minor and major releases receive annotated Git tags with human-readable change summaries.
- No historical tag backfill is performed unless explicitly requested.

## Key endpoints

```text
/                         Installer home page
/manifest.json            Production v5 addon manifest
/v5/manifest.json         Explicit v5 manifest
/catalog/series/:id.json  Production series catalog
/meta/series/:id.json     Production v5 rich series metadata
/v5/meta/series/:id.json  Explicit v5 metadata
/api/meta/series/:id.json v5 metadata compatibility route
```

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

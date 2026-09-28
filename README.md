# Anime Releases for Nuvio — v2.18.14

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.18.14`
- **Production release:** `v2.18.0`
- **Next minor release baseline:** `2.19.0`
- **Latest production tag:** `v2.18.0`
- **Production resolver:** **v5**
- **Legacy resolver:** **retired**
- **Metadata ownership:** delegated to the user's preferred metadata addon
- **CI status:** **green**
- **Deployment checkpoint:** **5/5 — PAUSED**

The production addon is catalog-only. It supplies anime release/airing catalogs and delegates detailed metadata to the user's preferred metadata addon, such as BingeCat. Legacy metadata routes are retired from Vercel routing so this addon does not intercept metadata requests.

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
  v5 catalog-only resolver

/catalog/series/:id.json
    ↓
  season-aware anime release catalog
    ↓
  MAL/AniList identity
    ↓
  IMDb/TMDB/TVDB compatibility mapping
    ↓
  Nuvio metadata delegation
    ↓
  BingeCat / preferred metadata addon
```

The root manifest is the recommended installation URL. The explicit `/v5/...` catalog route remains available for compatibility/testing. Metadata is intentionally not advertised or routed by this addon.

## Metadata delegation

The addon is catalog-only for external metadata delegation. Seasonal catalog entries are dynamically resolved and their MAL/AniList identities are translated to compatible IMDb/TMDB/TVDB identities when available. For later-season entries, the mapper first checks related original/prequel anime metadata, then uses AniZip's maintained cross-database mappings, then falls back to original/base-name candidates with seasonal suffixes removed. This allows compatible metadata addons such as BingeCat to resolve the franchise identity without maintaining a duplicate metadata resolver.

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

AniList is the primary source for anime metadata, season/status information, artwork, scores, popularity, airing schedules, franchise relationships, and external links. Jikan and AniZip provide MAL mappings, episode data, broadcast/provider information, and fallbacks. Wikidata provides an additional cross-database fallback when a compatible identity cannot be obtained from the primary mapping sources. TVMaze is limited to freshness supplementation for ongoing long-running series.

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
- No historical tag backfill is performed unless explicitly requested.
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

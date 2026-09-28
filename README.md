# Anime Releases for Nuvio — v2.9.2

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current project

- **GitHub:** https://github.com/mbmelgo/nuvio-anime-releases-addon
- **Vercel:** https://nuvio-anime-releases-addon-rho.vercel.app
- **Manifest:** https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- **Resolver selector:** https://nuvio-anime-releases-addon-rho.vercel.app/
- **Branch:** `main`

## Current status

GitHub is the source of truth. Automatic Vercel Git deployments are intentionally disabled. Production deployments are **test-gated**: a normal GitHub push runs CI without deploying, while a commit containing `[deploy-prod]` triggers the Vercel Deploy Hook only after the unit-test job passes.

Release tags are created for successful deployment minor releases (`vX.Y.0`) and major releases (`vX.0.0`). Annotated tags include a human-readable summary of the source changes included in that release. Historical deployment tags are currently non-blocking.

The current production metadata routing uses **v4**. **v5** is the refactored candidate and remains available for validation.

## Resolver selection

The landing page now provides a resolver selector. It generates a resolver-specific manifest URL so v4 and v5 can be installed and tested independently.

```text
Home / selector
    ↓
Choose v4 or v5
    ↓
/v4/manifest.json       → v4 metadata routes
/v5/manifest.json       → v5 metadata routes
```

The manifests use separate addon IDs, allowing side-by-side installation in compatible clients. The root `/manifest.json` remains the existing v4-compatible manifest until v5 is deliberately promoted.

Stremio supports parameterized addon repository paths, where the selected path segment can be carried through the addon resource routes. citeturn4search1turn4search2

## Current release workflow

```text
GitHub push
    ↓
npm test
    ↓
FAIL → stop; no Vercel deployment
    ↓
PASS
    ↓
[deploy-prod]?
    ├── No → patch-version automation
    └── Yes → deployment checkpoint
                 ├── < 5 deployments → Vercel production
                 └── 5 deployments → PAUSE
```

The autonomous loop pauses after every **5 Vercel production deployments**. The checkpoint is stored in `ops/release-state.json`.

### Version rules

- Normal source commit → increment **patch**: `2.7.0 → 2.7.1`
- Successful Vercel deployment → increment **minor** and reset patch: `2.7.5 → 2.8.0`
- Major release → increment **major** manually: `2.8.0 → 3.0.0`

Generated version commits use `[skip-version-automation]` to prevent recursion.

## Resolver selector

Open the Vercel home page to choose between the stable v4 resolver and the v5 candidate. Each selection has its own manifest URL, so both resolver versions can be installed side-by-side:

```text
https://nuvio-anime-releases-addon-rho.vercel.app/v4/manifest.json
https://nuvio-anime-releases-addon-rho.vercel.app/v5/manifest.json
```

The root manifest remains the v4-compatible production manifest. Selecting v5 does not change the v4 installation.

The resolver selector candidate has passed the full Node 20 regression suite and is ready for consolidated production validation.

## Resolver versions

### v4 — production

`api/meta-resolver-v4.js` is the current production resolver.

Install/test directly:

`https://nuvio-anime-releases-addon-rho.vercel.app/v4/manifest.json`

### v5 — refactored candidate

`api/meta-resolver-v5.js` is the refactored candidate. It is covered by the regression suite and is being validated before promotion to production.

Install/test directly:

`https://nuvio-anime-releases-addon-rho.vercel.app/v5/manifest.json`

Recent regression coverage includes franchise continuation detection for titles such as **Attack on Titan: The Final Season**, while separately titled sequel series remain excluded.

## Metadata and episodes

The resolver accepts MAL IDs such as `mal:39535` and returns Nuvio-compatible series metadata.

## Regression tests

The TDD regression suite covers:

- Death Note — MAL 1535
- Mushoku Tensei — MAL 39535
- One Piece — MAL 21
- Long-running anime without an arbitrary 100-episode ceiling
- Season/franchise continuation grouping
- `Final Season` continuation titles
- Episode ID uniqueness and normalization
- Special/recap/OVA/ONA/movie filtering
- Production routing regressions
- v4/v5 resolver manifest selection and addon IDs

## Key endpoints

```text
/                         Resolver selection home page
/manifest.json            Existing v4-compatible addon manifest
/v4/manifest.json         Explicit v4 addon manifest
/v5/manifest.json         Explicit v5 addon manifest
/catalog/series/:id.json  Series catalog (v4-compatible)
/meta/series/:id.json     Series metadata (v4-compatible)
/v4/meta/series/:id.json Explicit v4 metadata
/v5/meta/series/:id.json Explicit v5 metadata
/api/meta/series/:id.json Series metadata compatibility route
```

## Data sources

AniList is the primary source for metadata, season/status information, artwork, scores, popularity, airing schedules, and franchise relationships. Jikan and AniZip provide MAL mappings, episode data, and fallbacks. TVMaze is limited to freshness supplementation for ongoing long-running series and does not replace missing primary data for finished series.

## Version and deployment state

The repository's version file is currently the source of truth for the patch-level development version. `package.json`, `api/stremio.js`, and the README version are synchronized by the workflow.

The current autonomous deployment checkpoint is **2/5** for the active cycle. The latest successful deployment recorded in `ops/release-state.json` is source commit `4a66e89f100d5d2cfad3316c923c4c78041e43d9`, deployed as version **2.7.15**, with the next deployment baseline **2.8.0**. The current development version is **2.8.5**.

## Vercel rewrites

Production metadata routing currently remains on v4. The new `/v5/*` namespace is available for candidate validation but has **not been deployed yet**.

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

## Version

**2.8.5**

<!-- Temporary CI validation marker; removed after validation. -->

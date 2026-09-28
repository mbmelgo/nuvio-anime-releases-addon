# Anime Releases for Nuvio — v2.7.11

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current project

- **GitHub:** https://github.com/mbmelgo/nuvio-anime-releases-addon
- **Vercel:** https://nuvio-anime-releases-addon-rho.vercel.app
- **Manifest:** https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- **Branch:** `main`

## Current status

GitHub is the source of truth. Automatic Vercel Git deployments are intentionally disabled. Production deployments are **test-gated**: a normal GitHub push runs CI without deploying, while a commit containing `[deploy-prod]` triggers the Vercel Deploy Hook only after the unit-test job passes.

Release tags are created for successful deployment minor releases (`vX.Y.0`) and major releases (`vX.0.0`). Annotated tags include a human-readable summary of the source changes included in that release. Historical deployment tags can be backfilled from `ops/release-state.json`.

The current production metadata routing uses **v4**. **v5** is the refactored candidate and remains available for validation.

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

## Resolver versions

### v4 — production

`api/meta-resolver-v4.js` is the current production resolver. Existing Vercel rewrites continue to point metadata requests to v4.

### v5 — refactored candidate

`api/meta-resolver-v5.js` is the refactored candidate. It is covered by the regression suite and is being validated before promotion to production.

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

## Key endpoints

```text
/                         Home page
/manifest.json            Addon manifest
/catalog/series/:id.json  Series catalog
/meta/series/:id.json     Series metadata
/api/meta/series/:id.json Series metadata compatibility route
```

## Data sources

AniList is the primary source for metadata, season/status information, artwork, scores, popularity, airing schedules, and franchise relationships. Jikan and AniZip provide MAL mappings, episode data, and fallbacks. TVMaze is limited to freshness supplementation for ongoing long-running series and does not replace missing primary data for finished series.

## Version and deployment state

The repository's version file is currently the source of truth for the patch-level development version. `package.json`, `api/stremio.js`, and the README version are synchronized by the workflow.

The current autonomous deployment checkpoint is **1/5** for the active cycle. The latest successful deployment recorded in `ops/release-state.json` is source commit `54cb48bba679a3d27336f169846a830f374c4082`, deployed as version **2.6.5**, with the next minor release baseline **2.7.0**.

The release-tag backfill mechanism is repairing the missing historical `v2.7.11` tag for that exact deployed source commit.

## Vercel rewrites

Production metadata routing currently remains on v4. Automatic Git deployment remains disabled.

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

## Version

**2.7.5**

<!-- Release-tag backfill retry [tag-backfill] -->

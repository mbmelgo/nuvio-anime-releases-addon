# Anime Releases for Nuvio — v2.7.5

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

Lean episode format:

```json
{
  "id": "tt13293588:1:1",
  "title": "Jobless Reincarnation",
  "season": 1,
  "episode": 1,
  "released": "2021-01-10T15:00:00.000Z",
  "thumbnail": "https://..."
}
```

Preferred ID format: `<imdbId>:<season>:<episode>`

Fallback: `mal:<malId>:<season>:<episode>`

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

Current examples:
- https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/ongoing.json
- https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/new_episodes.json
- https://nuvio-anime-releases-addon-rho.vercel.app/catalog/series/next_episodes.json
- https://nuvio-anime-releases-addon-rho.vercel.app/meta/series/mal%3A39535.json

## Data sources

### AniList

Primary source for anime metadata, season/status information, artwork, genres, scores, popularity, trending, favourites, airing schedules, and franchise relationships.

### Jikan

Used for MAL metadata, relationships, episode data, and fallback information. Jikan may rate-limit or return incomplete episode data.

### AniZip

Used for MAL → AniList mapping and episode metadata including titles, dates, thumbnails, and season/episode information. It is particularly useful for long-running anime.

Other providers such as Kitsu, AniMap, or TVMaze may be used selectively for specific data gaps. TVMaze is limited to freshness supplementation for ongoing long-running series; it does not replace missing primary data for finished series.

## Version and deployment state

The repository's version file is currently the source of truth for the patch-level development version. `package.json`, `api/stremio.js`, and the README version are synchronized by the workflow.

The current autonomous deployment checkpoint is **1/5** for the active cycle. The latest successful deployment recorded in `ops/release-state.json` is source commit `54cb48bba679a3d27336f169846a830f374c4082`, deployed as version **2.6.5**, with the next minor release baseline **2.7.0**.

The release-tag backfill mechanism is currently repairing the missing historical `v2.7.5` tag for that exact deployed source commit.

## Project structure

```text
api/
├── home.js
├── meta-resolver-v4.js
├── meta-resolver-v5.js
├── stremio.js
└── lib/
    ├── episodes.js
    ├── http.js
    └── providers.js

.github/
└── workflows/
    └── test.yml

ops/
└── release-state.json

vercel.json
package.json
README.md
```

## Vercel rewrites

Production metadata routing currently remains on v4:

```text
/manifest.json
    → /api/stremio?resource=manifest

/catalog/:type/:id.json
    → /api/stremio?resource=catalog&type=:type&id=:id

/meta/:type/:id.json
    → /api/meta-resolver-v4?type=:type&id=:id

/api/meta/series/:id.json
    → /api/meta-resolver-v4?type=series&id=:id

/
    → /api/home
```

Automatic Git deployment remains disabled with:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

## Streams

This is a **catalog and metadata addon only**. It does not provide video streams, downloads, torrent hashes, or playback sources.

## Version

**2.7.3**

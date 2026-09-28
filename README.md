# Anime Releases for Nuvio — v2.3.0

A season-aware anime catalog and metadata addon for **Nuvio / BingeCat / Stremio-compatible clients**.

Version **2.1.0** documents the refactored metadata architecture and current deployment workflow.

## Current project

- **GitHub:** https://github.com/mbmelgo/nuvio-anime-releases-addon
- **Vercel:** https://nuvio-anime-releases-addon-rho.vercel.app
- **Manifest:** https://nuvio-anime-releases-addon-rho.vercel.app/manifest.json
- **Branch:** `main`

## Current status

GitHub is the source of truth. Automatic Vercel Git deployments are intentionally disabled. Production deployments are now **test-gated**: a normal GitHub push runs CI without deploying, while a commit containing `[deploy-prod]` triggers the Vercel Deploy Hook only after the unit-test job passes.

The current production metadata routing uses **v4**. **v5** is the refactored candidate and remains available for validation.

## v2.3.0 highlights

- Refactored metadata resolver architecture.
- Franchise discovery separated from episode retrieval, classification, and Nuvio response formatting.
- AniList/Jikan relationships are used for multi-season franchise discovery instead of relying on a single Jikan sequel chain.
- AniZip can provide/enrich larger episode datasets, especially for long-running anime.
- Jikan remains an important metadata and episode fallback source.
- Source-aware episode classification filters specials, OVAs, ONAs, movies, recaps, compilations, credits, trailers, and other non-standard material where source metadata identifies it.
- Episode titles are normalized so `[object Object]` cannot be returned.
- Episode objects are intentionally lean: no episode-level `overview` or `runtime`.
- `released` and `thumbnail` are omitted when unavailable.
- No arbitrary 100-episode limit.
- v4 remains available as the production fallback while v5 is being validated.

## Architecture

```text
Nuvio
  ↓
Meta resolver
  ↓
MAL ID parsing
  ↓
Franchise discovery
  ├── AniList
  └── Jikan fallback
  ↓
Season resolution
  ↓
Episode resolution
  ├── AniZip
  ├── Jikan fallback
  └── additional fallbacks where justified
  ↓
Episode normalization
  ↓
Source-aware special/recap filtering
  ↓
Deduplication
  ↓
Lean Nuvio metadata
```

**Franchise discovery ≠ Episode retrieval ≠ Episode classification ≠ Nuvio response formatting**

## Resolver versions

### v4 — production fallback

`api/meta-resolver-v4.js` remains the current production resolver. Existing Vercel rewrites continue to point metadata requests to v4.

### v5 — refactored candidate

`api/meta-resolver-v5.js` is the refactored candidate. Do not remove v4 until v5 passes the regression suite and is confirmed stable.

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

Normal TV episodes should exclude non-standard material such as specials, recaps, compilations, OVAs, ONAs, movies, openings, endings, previews, credits, trailers, and unrelated side stories when source metadata identifies them. Source metadata is preferred over title matching.

Known One Piece examples requiring special handling include **Episode of Nami**, **Episode of Merry**, **Episode of Sabo**, **Fan Letter**, and **Barto's Secret Room**.

## Regression tests

### Death Note — MAL 1535

Single-season baseline: **37 episodes, S1E1–S1E37**.

### Mushoku Tensei — MAL 39535

Multi-season/cour test. Exact output must be revalidated against current upstream data.

### One Piece — MAL 21

Long-running stress test. The old implementation stopped at 100 episodes. The current architecture has no arbitrary 100-episode ceiling; exact output must be revalidated against current upstream data.

Additional candidates: Naruto, Bleach, Gintama, Fairy Tail, Dragon Ball, Hunter × Hunter, Re:ZERO, Attack on Titan, and JoJo's Bizarre Adventure. Bleach validation includes the marked Thousand-Year Blood War sequel chain.

## Regression checklist

For every tested anime verify:

- HTTP 200 and valid JSON
- `meta` exists and is not null
- `type === "series"`
- correct MAL ID and title
- unique episode IDs
- titles are strings
- positive season/episode numbers
- no `[object Object]`
- no unnecessary episode `overview` or `runtime`
- valid dates/thumbnails when present
- expected season structure
- no duplicate season/episode pairs
- no artificial 100-episode cap
- no special/recap/OVA/ONA/movie leakage
- reasonable response size

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

## Catalogs

The addon dynamically exposes season-aware catalogs including:

| Catalog | Purpose |
|---|---|
| Ongoing — current season | Currently releasing TV anime, including still-releasing titles from the immediately previous season. |
| Airing Today | TV anime airing during the current Philippine calendar day. |
| New Episodes — Last 7 Days | Episodes released today or during the previous six Philippine calendar days. |
| Next Episodes — Next 7 Days | Scheduled future episodes during the next seven Philippine calendar days. |
| Upcoming — next season | Next-season TV anime not yet released. |
| Finished — current season | Current-season anime marked finished by AniList. |
| Previous Season | Immediately previous season. |
| Popular / Top Rated / Trending | Current-season lists ordered by the corresponding AniList metric. |

## Data sources

### AniList

Primary source for anime metadata, season/status information, artwork, genres, scores, popularity, trending, favourites, airing schedules, and franchise relationships.

### Jikan

`https://api.jikan.moe/v4`

Used for MAL metadata, relationships, episode data, and fallback information. Jikan may rate-limit or return incomplete episode data, so it is not the sole authority for long-running anime.

### AniZip

`https://api.ani.zip/v1`

Used for MAL → AniList mapping and episode metadata including titles, dates, thumbnails, and season/episode information. It is particularly useful when long-running anime exceed what a normal Jikan response provides.

Other providers such as Kitsu, AniMap, or TVMaze may be used selectively for specific data gaps.

## Vercel deployment workflow

**Automatic Vercel Git deployments are disabled.** Production deployment is test-gated by GitHub Actions and uses the `[deploy-prod]` commit marker.

```text
GitHub push
    ↓
npm test
    ↓
FAIL → stop
    ↓
PASS
    ↓
[deploy-prod]?
    ├── No → patch-version automation
    └── Yes → deployment checkpoint
                 ├── < 5 deployments → Vercel production
                 └── 5 deployments → PAUSE
```

The autonomous loop pauses after every **5 Vercel production deployments**. The checkpoint is stored in `ops/release-state.json`. After a pause, live status and TODOs are reported before the loop is resumed.

### Version rules

Starting from the current baseline:

- Normal source commit → increment **patch**: `2.1.0 → 2.1.1 → 2.1.2`
- Successful Vercel deployment → increment **minor** and reset patch: `2.1.2 → 2.2.0`
- Major release → increment **major** manually: `2.2.0 → 3.0.0`

Deployment commits therefore establish the next minor-release baseline after the successful deployment. Generated version commits are marked `[skip-version-automation]` to prevent recursion.

The current checkpoint is intentionally paused at **5/5 deployments** after deployment `dpl_GnG8JUzVuRhqXxL96i6KCayF5Son`. Production remained on version 2.0.0; the repository baseline is now 2.1.0 for the next development cycle.

The GitHub Actions workflow uses the `VERCEL_DEPLOY_HOOK_URL` repository secret. The hook URL is never stored in the repository.

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

vercel.json
package.json
README.md
```

## Vercel rewrites

The existing rewrites must remain intact:

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

**2.1.0**

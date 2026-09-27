# Anime Releases for Nuvio

A free, season-aware anime catalog and metadata addon for **Nuvio / Stremio**.

The addon uses AniList for public anime metadata and airing schedules, and enriches series details with episode information from Jikan when available. It is designed to keep anime discovery current without maintaining a manual list.

## Live deployment

**Vercel landing page:**

`https://nuvio-anime-releases-addon.vercel.app/`

The landing page provides an overview of the addon, installation instructions, catalog examples, and the currently deployed manifest URL.

## Manifest

Install this manifest URL in Nuvio or Bingecat:

`https://nuvio-anime-releases-addon.vercel.app/manifest.json`

### Installation

1. Open **Nuvio**.
2. Open the **Addons** section.
3. Choose **Install from URL** / the manifest URL option.
4. Paste the manifest URL above.
5. Install the addon.
6. Open the addon catalogs from the discovery/catalog area.

The same manifest can be used by Stremio-compatible clients and by Bingecat when it accepts Stremio addon manifests.

## Catalogs

The addon automatically calculates the current, previous, and upcoming anime seasons using the `Asia/Manila` calendar.

| Catalog | Purpose |
|---|---|
| **Ongoing — current season** | TV anime currently marked `RELEASING` in the current season, plus still-releasing shows from the immediately previous season. |
| **Airing Today** | TV anime with an episode airing during the current Philippine calendar day. |
| **New Episodes — Last 7 Days** | TV anime with an episode aired during the current day or previous six Philippine calendar days. |
| **Next Episodes — Next 7 Days** | TV anime with a scheduled future episode during the next seven Philippine calendar days. |
| **Upcoming — next season** | TV anime in the next season currently marked `NOT_YET_RELEASED`. |
| **Finished — current season** | TV anime from the current season that AniList now marks `FINISHED`. |
| **Previous Season** | TV anime from the immediately previous season, useful for shows that crossed the seasonal boundary. |
| **Popular — current season** | Current-season TV anime ordered by AniList popularity. |
| **Top Rated — current season** | Current-season TV anime ordered by AniList score. |
| **Trending — current season** | Current-season TV anime ordered by AniList trending activity. |
| **Action / Adventure / Comedy / Fantasy / Romance** | Genre-focused current-season catalogs. |

The catalogs are generated dynamically. A new anime season does not require a code or list update.

### Seven-day release behavior

The release catalogs use Philippine calendar days rather than a rolling 168-hour window:

- `D-6 00:00 Asia/Manila` through `D+1 00:00 Asia/Manila`
- Today + the previous six calendar days
- Newest airings are shown first
- If a series has multiple releases in the window, only its newest episode is represented by the catalog card

## Sample artwork

The README examples use actual promotional artwork for representative anime. The addon itself uses the poster URL supplied by AniList, so catalog artwork is not hard-coded.

### Ongoing — current season

<table>
  <tr>
    <td align="center" valign="top" width="33%"><img src="https://static.animecorner.me/2026/07/1783038671-9d61bf21790930312244f5b74688b694.jpg" alt="Mushoku Tensei Season 3" width="180" height="270"><br><strong>Mushoku Tensei S3</strong><br><sub>Adventure · Fantasy</sub></td>
    <td align="center" valign="top" width="33%"><img src="https://a.storyblok.com/f/178900/1064x1505/4667f20d3d/you-and-i-are-polar-opposites-season-2-visual.jpg/m/filters%3Aquality%2895%29format%28webp%29" alt="You and I Are Polar Opposites Season 2" width="180" height="270"><br><strong>You &amp; I Are Polar Opposites S2</strong><br><sub>Romance · Comedy</sub></td>
    <td align="center" valign="top" width="33%"><img src="https://a.storyblok.com/f/178900/1429x2000/603b492a7d/magilumiere-season-2-visual.png/m/filters%3Aquality%2895%29format%28webp%29" alt="Magilumiere Season 2" width="180" height="270"><br><strong>Magilumiere S2</strong><br><sub>Action · Fantasy</sub></td>
  </tr>
</table>

### Upcoming — next season

<table>
  <tr>
    <td align="center" valign="top" width="25%"><img src="https://s.animeanime.jp/imgs/p/64XVvff3mD9cFhi_PU1_DqGg_6ytrq_oqaqr/827582.jpg" alt="The Apothecary Diaries Season 3" width="180" height="270"><br><strong>The Apothecary Diaries S3</strong><br><sub>Fall 2026 · Not yet released</sub></td>
    <td align="center" valign="top" width="25%"><img src="https://img2.animatetimes.com/2023/12/0d2164451110a40bebfbda523771b55a6586d2b030c432_28874100_d09fe7164ef1c1970d800bc8bf137efcbfe819d4.jpg" alt="A Returner's Magic Should Be Special Season 2" width="180" height="270"><br><strong>A Returner's Magic S2</strong><br><sub>Fall 2026 · Not yet released</sub></td>
    <td align="center" valign="top" width="25%"><img src="https://www.anime2you.de/media/2025/07/A-Tale-of-the-Secret-Saint-KV.webp" alt="A Tale of the Secret Saint" width="180" height="270"><br><strong>A Tale of the Secret Saint</strong><br><sub>Fall 2026 · Not yet released</sub></td>
    <td align="center" valign="top" width="25%"><img src="https://img.anmosugoi.com/file/media-sugoi/2025/12/TOUGEN-ANKI-Nikko-Kegon-Falls-Arc-visual.webp" alt="TOUGEN ANKI: Nikko Arc" width="180" height="270"><br><strong>TOUGEN ANKI: Nikko Arc</strong><br><sub>Fall 2026 · Not yet released</sub></td>
  </tr>
</table>

### New Episodes — Last 7 Days

<table>
  <tr>
    <td align="center" valign="top" width="25%"><img src="https://static.animecorner.me/2026/07/1783038671-9d61bf21790930312244f5b74688b694.jpg" alt="Mushoku Tensei Season 3" width="180" height="270"><br><strong>Mushoku Tensei S3</strong><br><sub>Recent episode</sub></td>
    <td align="center" valign="top" width="25%"><img src="https://a.storyblok.com/f/178900/1429x2000/603b492a7d/magilumiere-season-2-visual.png/m/filters%3Aquality%2895%29format%28webp%29" alt="Magilumiere Season 2" width="180" height="270"><br><strong>Magilumiere S2</strong><br><sub>Recent episode</sub></td>
    <td align="center" valign="top" width="25%"><img src="https://a.storyblok.com/f/178900/1064x1505/4667f20d3d/you-and-i-are-polar-opposites-season-2-visual.jpg/m/filters%3Aquality%2895%29format%28webp%29" alt="You and I Are Polar Opposites Season 2" width="180" height="270"><br><strong>You &amp; I Are Polar Opposites S2</strong><br><sub>Recent episode</sub></td>
  </tr>
</table>

## Anime Details

The addon exposes a full `meta` resource for its `mal:` and `anilist:` IDs. This is what allows Nuvio to open a richer Details page instead of treating the catalog entry as a poster-only item.

The metadata includes:

- Title and alternative titles
- Poster and background/banner
- Description
- Genres
- Runtime
- Release year and initial release date
- Country of origin
- AniList score
- AniList popularity, trending activity, and favourites count
- MAL ID and AniList ID
- Source material type when available
- Main studio information
- AniList/MAL and other external links
- Trailer information when AniList provides a YouTube trailer
- Current/next airing episode and timestamp
- Season and episode information

### Seasons and episodes

For series details, the addon builds `meta.videos` using the standard Stremio series video structure:

- `season`
- `episode`
- `title`
- `released`
- `overview` when available
- `thumbnail` when available
- `runtime` when available

The addon follows the franchise's related TV entries so a season 3 entry can expose earlier seasons as well. Season numbers are inferred from explicit season titles where possible and otherwise assigned chronologically.

Jikan is used to enrich episode titles, synopses, dates, and thumbnails when its episode endpoint is available. AniList airing schedules are used as the fallback for release dates.

## IDs and metadata routing

Catalog entries use:

- `mal:<MAL ID>` when AniList has a MyAnimeList ID
- `anilist:<AniList ID>` as the fallback

The manifest explicitly declares these prefixes for the metadata resource. This lets Nuvio filter metadata requests to this addon when it encounters one of these IDs.

Example:

`mal:21`

Metadata endpoint:

`/meta/series/mal:21.json`

The Vercel deployment routes that endpoint to `api/meta.js`.

## Pagination

Catalog requests support Stremio's `skip` parameter. AniList is queried in pages of 50 items, so large catalogs can continue loading instead of being permanently limited to the first page.

## Data sources

### AniList

AniList is the primary source for:

- Season classification
- Release status
- Anime metadata
- Posters and banners
- Genres
- Scores/popularity/trending/favourites
- Airing schedules
- Next episode information
- Franchise relations

### Jikan

Jikan is used only to enrich episode-level information for known MyAnimeList entries. The addon does not require a Jikan account.

No AniList or MyAnimeList login is required.

## Caching and automatic updates

The addon is request-driven. It does not require a cron job or manually maintained anime list.

Responses use approximately one-hour CDN caching with stale-while-revalidate and stale-if-error behavior. This means seasonal catalogs and airing information refresh automatically while avoiding unnecessary repeated API requests.

The addon also handles upstream API failures by returning an empty catalog or null metadata response instead of crashing the serverless function.

## Streams and playback

This is a **catalog and metadata addon only**.

It does **not** provide video streams, downloads, torrent hashes, or playback sources. Playback remains dependent on the stream addons/providers installed separately in Nuvio.

## Project structure

```text
api/
├── stremio.js   # Manifest + catalog endpoints
└── meta.js      # Detailed series metadata + seasons/episodes

docs/
├── images/      # README sample illustrations
└── posters/     # Poster sample assets

vercel.json      # Public URL rewrites
package.json     # Node/Vercel project metadata
README.md        # Project documentation
```

## Deployment

The project is designed for Vercel and requires no database or background worker.

### Requirements

- GitHub repository
- Vercel account
- Node.js 20+
- No database
- No paid API key
- No cron job

### Deploy

1. Import the repository into Vercel.
2. Deploy using the default settings.
3. Verify `/manifest.json` returns a valid manifest.
4. Install the deployed `/manifest.json` URL in Nuvio/Bingecat.

Production landing page:

`https://nuvio-anime-releases-addon.vercel.app/`

Production manifest:

`https://nuvio-anime-releases-addon.vercel.app/manifest.json`

## Limitations

- AniList availability and data quality determine the accuracy of season, score, popularity, and airing information.
- AniList's public API is rate-limited, so the addon avoids unnecessary background requests and relies on caching.
- Airing catalogs are limited to TV anime.
- The seven-day release catalog intentionally shows one card per anime, representing its newest episode in the window.
- Jikan episode enrichment is best-effort; AniList schedule data remains the fallback.
- The addon does not provide streams.

## Compatibility

The addon follows the standard Stremio addon protocol for manifest, catalog, and metadata resources. Nuvio uses this same addon ecosystem, including resource filtering and optional `idPrefixes` for metadata routing.

## License and artwork

This project is provided for personal use. Anime metadata and promotional artwork remain the property of AniList, MyAnimeList, production committees, studios, publishers, and their respective rights holders.

<!-- Private-repository deployment test: 2026-09-27 -->
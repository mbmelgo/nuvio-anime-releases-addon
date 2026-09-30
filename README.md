# Anime Releases for Nuvio — v3.54.2

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `3.54.2`
- **Production release:** `v3.53.0`
- **Release candidate:** `v3.54.2`
- **Autonomous deployment checkpoint:** `0/10` for this iteration only

## v3.54.2 changes

- Keeps the shared catalog identity pipeline with `withAniBridge` as an explicit runtime option.
- Keeps the primary manifest AniList-only, using `anilist:<id>` identities without AniBridge requests.
- Keeps the `/anibridge/manifest.json` compatibility manifest using the same codebase.
- Preserves AniBridge mappings when available and falls back to `anilist:<id>` when unavailable or when the resolver fails.
- Keeps Nuvio preview metadata such as title, poster, genres, and release information.
- Aligns production smoke validation and regression coverage with the new AniList identity model.

## Architecture

```text
AniList → primary manifest → anilist:<id> → Nuvio → BingeCat metadata

AniList → compatibility manifest → AniBridge mapping
                              ↘ no mapping/error → anilist:<id>
```

Both manifests use the same catalog implementation; only identity resolution differs.

## Production validation

The initial v3.54.0 deployment reached Vercel, but its release smoke test still expected legacy provider IDs. The release validation was corrected and regression-tested; v3.54.2 is queued for the controlled production release.

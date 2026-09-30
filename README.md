# Anime Releases for Nuvio — v3.53.3

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `feature/optional-anibridge-manifests`
- **Development version:** `3.53.3`
- **Production release:** `v3.53.0`
- **Release candidate:** `v3.53.2`
- **Autonomous deployment checkpoint:** `0/10` for this iteration only

## v3.53.2 changes

- Adds a shared catalog identity pipeline with `withAniBridge` as an explicit runtime option.
- Makes the primary manifest AniList-only, using `anilist:<id>` identities without AniBridge requests.
- Adds an `/anibridge/manifest.json` compatibility manifest using the same codebase.
- Preserves AniBridge mappings when available and falls back to `anilist:<id>` when unavailable or when the resolver fails.
- Keeps Nuvio preview metadata such as title, poster, genres, and release information.
- Adds regression coverage for AniList-only identity, mapped AniBridge identity, missing AniBridge mapping, and dual-manifest behavior.
- Expands routing regression coverage for the compatibility manifest and catalog path.

## Architecture

```text
AniList → primary manifest → anilist:<id> → Nuvio → BingeCat metadata

AniList → compatibility manifest → AniBridge mapping
                              ↘ no mapping/error → anilist:<id>
```

Both manifests use the same catalog implementation; only identity resolution differs.

## Production validation

The current production baseline is `v3.53.0`. The optional-manifest change is not yet deployed while its PR is being tested and reviewed.

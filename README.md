# Anime Releases for Nuvio — v2.27.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.27.1`
- **Production release:** `v2.25.0` until this release is deployed
- **Next minor release baseline:** `2.27.0`
- **Latest production tag:** `v2.25.0`
- **Architecture:** **catalog-only**
- **Catalog identity:** stable MAL/AniList identities; provider-specific IDs do not replace catalog IDs
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **CI status:** **green** for the stable catalog identity refactor
- **Deployment checkpoint:** **3/5** before this production release.

The addon is intentionally responsible only for anime release and airing catalogs. Detailed metadata is delegated to BingeCat rather than duplicated inside this addon. Catalog identity is preserved from the source catalog so related movies, older franchise entries, or ambiguous external mappings cannot silently replace the requested anime.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

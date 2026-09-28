# Anime Releases for Nuvio — v2.26.0

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.26.0`
- **Production release:** `v2.25.0`
- **Next minor release baseline:** `2.26.0`
- **Latest production tag:** `v2.25.0`
- **Architecture:** **catalog-only**
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **CI status:** **green** for the v2.25.0 release
- **Deployment checkpoint:** **3/5** in the current autonomous cycle.

The addon is intentionally responsible only for anime release and airing catalogs. Detailed metadata is delegated to BingeCat rather than duplicated inside this addon. Legacy metadata routes and the old local metadata resolver have been retired.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

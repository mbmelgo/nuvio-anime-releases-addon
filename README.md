# Anime Releases for Nuvio — v2.23.1

A season-aware anime release catalog for **Nuvio / BingeCat / Stremio-compatible clients**.

## Current status

- **Branch:** `main`
- **Development version:** `2.23.1`
- **Production release:** `v2.22.0` → **releasing `v2.23.0`**
- **Next minor release baseline:** `2.23.0`
- **Latest production tag:** `v2.22.0`
- **Architecture:** **catalog-only**
- **Detailed metadata:** delegated to **BingeCat / the configured metadata addon**
- **CI status:** **green** for the release candidate
- **Deployment checkpoint:** **0/5** in the new autonomous cycle; this release is deployment #1/5.

The addon is intentionally responsible only for anime release and airing catalogs. Detailed metadata is delegated to BingeCat rather than duplicated inside this addon. Legacy metadata routes and the old local metadata resolver have been retired.

Automatic Vercel Git deployments are intentionally disabled. Production deployments are test-gated through GitHub Actions and the Vercel deployment hook.

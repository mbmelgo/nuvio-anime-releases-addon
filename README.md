# Anime Releases for Nuvio

[![Nuvio](https://img.shields.io/badge/Nuvio-addon-ff6f61.svg)](https://nuvio.tv)
[![AniList](https://img.shields.io/badge/AniList-data_source-02A9FF.svg)](https://anilist.co)
[![Vercel](https://img.shields.io/badge/deployed_on-Vercel-black.svg?logo=vercel)](https://vercel.com)
[![Version](https://img.shields.io/badge/version-4.2.1-blue.svg)](https://github.com/mbmelgo/nuvio-anime-releases-addon/releases)

> A lightweight, season-aware anime release catalog for Nuvio and Stremio-compatible clients.

**Anime Releases for Nuvio** provides dynamically generated seasonal and rolling anime release catalogs using **AniList** as the catalog source. Anime are exposed with their canonical `anilist:<id>` identity, while detailed metadata and provider mapping are delegated to the metadata addon configured in the client.

---

## ✨ Features

### 📺 Seasonal Anime Catalogs

The addon exposes three seasonal catalogs:

- **Upcoming Season** — anime scheduled for the next season.
- **Current Season** — anime belonging to the current season.
- **Previous Season** — anime from the immediately preceding season.

All three catalogs retain the existing AniList `Page.media` query model; only the requested season changes.

### ⏱️ Rolling Release Catalogs

The addon also exposes two rolling release catalogs:

- **Upcoming — 5 days** — unique anime with an upcoming airing schedule in the next five days.
- **Previous — 7 days** — unique anime with an airing schedule in the previous seven days.

Rolling catalogs use a separate AniList `Page.airingSchedules` pipeline, deduplicate by AniList media ID, and apply Nuvio pagination after deduplication.

### 🗂️ Broad Anime Format Coverage

Seasonal catalogs include these AniList anime formats:

- **TV**
- **TV Short**
- **ONA**
- **OVA**
- **Special**
- **Movie**

Rolling catalogs inherit the formats represented by AniList airing schedules.

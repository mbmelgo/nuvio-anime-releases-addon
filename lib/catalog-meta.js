export function filterCatalogMetasBySearch(metas, search) {
  const needle = String(search || "").trim().toLocaleLowerCase();
  if (!needle) return metas;
  return metas.filter((meta) =>
    [meta.name, meta.extra?.titleEnglish, meta.extra?.titleRomaji, meta.extra?.titleNative]
      .some((value) => String(value || "").toLocaleLowerCase().includes(needle))
  );
}

export function toMetaFromAniList(anilistId, media = {}) {
  const id = `anilist:${String(anilistId)}`;
  const title = media.title || {};
  const extra = {
    anilistId: Number(anilistId),
    ...(media.idMal ? { malId: media.idMal } : {}),
    ...(title.english ? { titleEnglish: title.english } : {}),
    ...(title.romaji ? { titleRomaji: title.romaji } : {}),
    ...(title.native ? { titleNative: title.native } : {}),
    ...(media.status ? { status: media.status } : {}),
  };

  if (media.nextAiringEpisode) {
    extra.nextEpisode = media.nextAiringEpisode.episode;
    extra.nextAiringAt = media.nextAiringEpisode.airingAt;
  }

  const meta = {
    id,
    type: "anime",
    name: title.english || title.romaji || title.native || `Anime ${anilistId}`,
    posterShape: "poster",
    ...(media.coverImage?.large ? { poster: media.coverImage.large } : {}),
    ...(Array.isArray(media.genres) && media.genres.length ? { genres: media.genres } : {}),
    extra,
  };

  if (media.startDate?.year) {
    const startYear = media.startDate.year;
    const endYear = media.endDate?.year;
    meta.releaseInfo = media.status === "RELEASING"
      ? `${startYear}-`
      : endYear && endYear !== startYear
        ? `${startYear}-${endYear}`
        : String(startYear);
    if (media.startDate.month && media.startDate.day) {
      meta.released = new Date(Date.UTC(
        media.startDate.year,
        media.startDate.month - 1,
        media.startDate.day
      )).toISOString();
    }
  }

  return meta;
}

export function toMetaFromAniBridgeMapping(anilistId, mapping, media = {}) {
  if (!mapping?.tmdb && !mapping?.imdb && !mapping?.tvdb) return null;

  const anilistMedia = media?.title || media?.coverImage || media?.status || media?.startDate || media?.genres
    ? media
    : mapping.anilist || {};
  const title = anilistMedia.title || {};
  const id = mapping.tmdb
    ? `tmdb:${mapping.tmdb}`
    : mapping.imdb
      ? mapping.imdb
      : `tvdb:${mapping.tvdb}`;
  const extra = {
    anilistId: Number(anilistId),
    ...(mapping.tmdb ? { tmdbId: String(mapping.tmdb) } : {}),
    ...(mapping.imdb ? { imdbId: String(mapping.imdb) } : {}),
    ...(mapping.tvdb ? { tvdbId: String(mapping.tvdb) } : {}),
    ...(title.english ? { titleEnglish: title.english } : {}),
    ...(title.romaji ? { titleRomaji: title.romaji } : {}),
    ...(title.native ? { titleNative: title.native } : {}),
    ...(anilistMedia.status ? { status: anilistMedia.status } : {}),
  };

  const meta = {
    id,
    type: "anime",
    name: title.english || title.romaji || title.native || `Anime ${anilistId}`,
    posterShape: "poster",
    ...(anilistMedia.coverImage?.large ? { poster: anilistMedia.coverImage.large } : {}),
    ...(Array.isArray(anilistMedia.genres) && anilistMedia.genres.length ? { genres: anilistMedia.genres } : {}),
    extra,
  };

  if (anilistMedia.startDate?.year) {
    const startYear = anilistMedia.startDate.year;
    const endYear = anilistMedia.endDate?.year;
    meta.releaseInfo = anilistMedia.status === "RELEASING"
      ? `${startYear}-`
      : endYear && endYear !== startYear
        ? `${startYear}-${endYear}`
        : String(startYear);
    if (anilistMedia.startDate.month && anilistMedia.startDate.day) {
      meta.released = new Date(Date.UTC(
        anilistMedia.startDate.year,
        anilistMedia.startDate.month - 1,
        anilistMedia.startDate.day
      )).toISOString();
    }
  }

  return meta;
}

export function extractSupportedExternalIds(links) {
  const result = {};
  for (const link of Array.isArray(links) ? links : []) {
    const url = String(link?.url || "");
    const site = String(link?.site || "").toLowerCase();

    if (!result.tvdb && (site.includes("thetvdb") || /thetvdb\.com/i.test(url))) {
      const match = url.match(/thetvdb\.com\/(?:dereferrer\/series\/|series\/)(\d+)/i)
        || url.match(/thetvdb\.com\/\?tab=series&id=(\d+)/i);
      if (match) result.tvdb = match[1];
    }

    if (!result.tmdb && (site.includes("movie database") || site === "tmdb" || /themoviedb\.org/i.test(url))) {
      const match = url.match(/themoviedb\.org\/tv\/(\d+)/i);
      if (match) result.tmdb = match[1];
    }

    if (!result.imdb && (site.includes("imdb") || /imdb\.com/i.test(url))) {
      const match = url.match(/imdb\.com\/title\/(tt\d+)/i);
      if (match) result.imdb = match[1];
    }
  }
  return result;
}

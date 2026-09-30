export function filterCatalogMetasBySearch(metas, search) {
  const needle = String(search || "").trim().toLocaleLowerCase();
  if (!needle) return metas;
  return metas.filter((meta) =>
    [meta.name, meta.extra?.titleEnglish, meta.extra?.titleRomaji, meta.extra?.titleNative]
      .some((value) => String(value || "").toLocaleLowerCase().includes(needle))
  );
}

export function toMeta(media, episode) {
  if (!media) return null;

  const external = extractSupportedExternalIds(media.externalLinks);
  // Nuvio/BingeCat both advertise TMDB, IMDb and TVDB. Prefer TMDB/IMDb for
  // catalog identities because the current production failure is specifically
  // occurring on TVDB detail resolution. TVDB remains a valid fallback.
  const id = external.tmdb
    ? `tmdb:${external.tmdb}`
    : external.imdb
      ? external.imdb
      : external.tvdb
        ? `tvdb:${external.tvdb}`
        : `anilist:${media.id}`;

  const extra = {
    anilistId: media.id,
    ...(media.idMal ? { malId: media.idMal } : {}),
    ...(external.tvdb ? { tvdbId: external.tvdb } : {}),
    ...(external.tmdb ? { tmdbId: external.tmdb } : {}),
    ...(external.imdb ? { imdbId: external.imdb } : {}),
    ...(media.title?.english ? { titleEnglish: media.title.english } : {}),
    ...(media.title?.romaji ? { titleRomaji: media.title.romaji } : {}),
    ...(media.title?.native ? { titleNative: media.title.native } : {}),
    ...(media.status ? { status: media.status } : {}),
  };

  if (episode?.episode != null) extra.episode = episode.episode;
  if (episode?.airingAt != null) extra.airingAt = episode.airingAt;
  if (media.nextAiringEpisode) {
    extra.nextEpisode = media.nextAiringEpisode.episode;
    extra.nextAiringAt = media.nextAiringEpisode.airingAt;
  }

  const meta = {
    id,
    type: "anime",
    name: media.title?.english || media.title?.romaji || media.title?.native || `Anime ${media.id}`,
    posterShape: "poster",
    extra,
  };

  if (media.coverImage?.large) meta.poster = media.coverImage.large;

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

export function toMetaFromAniBridgeMapping(anilistId, mapping) {
  if (!mapping?.tmdb && !mapping?.imdb && !mapping?.tvdb) return null;

  const media = mapping.anilist || {};
  const title = media.title || {};
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
    ...(media.status ? { status: media.status } : {}),
  };

  return {
    id,
    type: "anime",
    name: title.english || title.romaji || title.native || `Anime ${anilistId}`,
    posterShape: "poster",
    ...(media.coverImage?.medium ? { poster: media.coverImage.medium } : {}),
    extra,
  };
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

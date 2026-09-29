import { ANILIST_PAGE_SIZE, FETCH_TIMEOUT_MS, buildCatalogMediaVariables } from "./catalog-config.js";
import { toMeta } from "./catalog-meta.js";

const ANILIST_URL = "https://graphql.anilist.co";

/*
 * Request only catalog-preview fields. AniList can return direct IMDb/TMDB
 * links for some entries, allowing the catalog to avoid an additional
 * provider-resolution round trip before Nuvio opens the detail page.
 */
export const CATALOG_MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large }
  status
  startDate { year month day }
  endDate { year }
  nextAiringEpisode { episode airingAt }
  externalLinks { site url }
`;

export const SCHEDULE_MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large }
  status
  startDate { year month day }
  endDate { year }
  nextAiringEpisode { episode airingAt }
  format
  externalLinks { site url }
`;

export async function queryAnime(filter, page, search = "") {
  const query = `
    query ($page:Int,$season:MediaSeason,$seasonYear:Int,$status:MediaStatus,$sort:[MediaSort],$search:String) {
      Page(page:$page,perPage:${ANILIST_PAGE_SIZE}) {
        media(
          type:ANIME,
          format:TV,
          season:$season,
          seasonYear:$seasonYear,
          status:$status,
          sort:$sort,
          search:$search,
          isAdult:false
        ) { ${CATALOG_MEDIA_FIELDS} }
      }
    }
  `;
  const data = await anilist(query, buildCatalogMediaVariables(filter, page, search));
  return (data?.Page?.media || []).map((media) => toMeta(media, media.nextAiringEpisode)).filter(Boolean);
}

export async function queryAiringSchedulePage(start, end, futureOnly, page) {
  const query = `
    query ($page:Int,$start:Int,$end:Int,$notYetAired:Boolean) {
      Page(page:$page,perPage:${ANILIST_PAGE_SIZE}) {
        airingSchedules(
          airingAt_greater:$start,
          airingAt_lesser:$end,
          notYetAired:$notYetAired,
          sort:TIME_DESC
        ) {
          id airingAt episode media { ${SCHEDULE_MEDIA_FIELDS} }
        }
      }
    }
  `;
  const data = await anilist(query, {
    page,
    start: Math.floor(start / 1000),
    end: Math.floor(end / 1000),
    notYetAired: futureOnly,
  });
  return data?.Page?.airingSchedules || [];
}

async function anilist(query, variables) {
  const response = await fetchWithTimeout(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.errors) {
    throw new Error(json.errors?.map((x) => x.message).join("; ") || `AniList HTTP ${response.status}`);
  }
  return json.data;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

import { ADDON_VERSION } from "./version.js";

export default function handler(req, res) {
  const current = getSeasonInfo(new Date());

  res.status(200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");

  if (req.method === "OPTIONS") return res.json({});
  return res.json(buildManifest(current));
}

export function buildManifest(info) {
  return {
    id: "com.marki.nuvio.anime-releases",
    version: ADDON_VERSION,
    name: "Anime Releases for Nuvio",
    description: "Season-aware anime release catalogs for Nuvio. Detailed metadata is delegated to the user's preferred metadata addon.",
    resources: [
      { name: "catalog", types: ["series"] },
    ],
    types: ["series"],
    catalogs: catalogDefinitions(info),
  };
}

function catalogDefinitions(info) {
  const current = `${prettySeason(info.ongoing.season)} ${info.ongoing.year}`;
  const previous = `${prettySeason(info.previous.season)} ${info.previous.year}`;
  const upcoming = `${prettySeason(info.upcoming.season)} ${info.upcoming.year}`;
  return [
    { type: "series", id: "ongoing", name: `Ongoing — ${current}` },
    { type: "series", id: "airing_today", name: "Airing Today" },
    { type: "series", id: "new_episodes", name: "New Episodes — Last 7 Days" },
    { type: "series", id: "next_episodes", name: "Next Episodes — Next 7 Days" },
    { type: "series", id: "upcoming", name: `Upcoming — ${upcoming}` },
    { type: "series", id: "finished_current", name: `Finished — ${current}` },
    { type: "series", id: "previous_season", name: `Previous Season — ${previous}` },
    { type: "series", id: "popular_current", name: `Popular — ${current}` },
    { type: "series", id: "top_rated_current", name: `Top Rated — ${current}` },
    { type: "series", id: "trending_current", name: `Trending — ${current}` },
  ];
}

function getSeasonInfo(date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", year: "numeric", month: "numeric" }).formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  if (month <= 3) return { previous: { season: "FALL", year: year - 1 }, ongoing: { season: "WINTER", year }, upcoming: { season: "SPRING", year } };
  if (month <= 6) return { previous: { season: "WINTER", year }, ongoing: { season: "SPRING", year }, upcoming: { season: "SUMMER", year } };
  if (month <= 9) return { previous: { season: "SPRING", year }, ongoing: { season: "SUMMER", year }, upcoming: { season: "FALL", year } };
  return { previous: { season: "SUMMER", year }, ongoing: { season: "FALL", year }, upcoming: { season: "WINTER", year: year + 1 } };
}

function prettySeason(season) { return season.charAt(0) + season.slice(1).toLowerCase(); }

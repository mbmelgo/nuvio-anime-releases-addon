import { catalogDefinitions, getSeasonInfo } from "./catalog-source.js";
import { ADDON_VERSION } from "./version.js";

export default function handler(req, res) {
  const current = getSeasonInfo(new Date());
  const withAniBridge = req.query?.withAniBridge === true || String(req.query?.withAniBridge || "").toLowerCase() === "true";

  res.status(200);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60, stale-while-revalidate=300");

  if (req.method === "OPTIONS") return res.json({});
  return res.json(buildManifest(current, { withAniBridge }));
}

export function buildManifest(info, options = {}) {
  const withAniBridge = options.withAniBridge === true;
  const baseId = "com.marki.nuvio.anime-releases";
  const catalogs = catalogDefinitions(info);

  return {
    id: withAniBridge ? `${baseId}-anibridge` : baseId,
    version: ADDON_VERSION,
    name: withAniBridge ? "Anime Releases for Nuvio (AniBridge)" : "Anime Releases for Nuvio",
    description: withAniBridge
      ? "Season-aware anime release catalogs using AniBridge identity resolution with an AniList fallback."
      : "Season-aware anime release catalogs using AniList identities directly. Detailed metadata is delegated to the user's preferred metadata addon.",
    resources: [
      { name: "catalog", types: ["anime"] },
    ],
    types: ["anime"],
    catalogs,
    identityMode: withAniBridge ? "anibridge" : "anilist",
  };
}

const ANIBRIDGE_MAPPINGS_URL = "https://mappings.anibridge.eliasbenb.dev/api/mappings";
const MAX_BATCH_SIZE = 50;

const TMDB_PROVIDERS = new Set(["tmdb", "tmdb_show"]);
const IMDB_PROVIDERS = new Set(["imdb", "imdb_show"]);
const TVDB_PROVIDERS = new Set(["tvdb", "tvdb_show"]);

export async function resolveAniListMappings(anilistIds, fetchImpl = fetch) {
  const ids = [...new Set(
    (Array.isArray(anilistIds) ? anilistIds : [anilistIds])
      .map((id) => String(id ?? "").trim())
      .filter((id) => /^\d+$/.test(id)),
  )].slice(0, MAX_BATCH_SIZE);

  const result = new Map();
  if (!ids.length) return result;

  const url = new URL(ANIBRIDGE_MAPPINGS_URL);
  url.searchParams.set("q", `source.provider:anilist source.id:${ids.join(",")}`);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", String(ids.length));
  url.searchParams.set("with_anilist", "true");

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`AniBridge HTTP ${response.status}`);
  }

  for (const item of Array.isArray(json?.items) ? json.items : []) {
    const id = String(item?.provider === "anilist" ? item?.entry_id : "").trim();
    if (!ids.includes(id)) continue;

    const edges = Array.isArray(item?.edges) ? item.edges : [];
    result.set(id, {
      tmdb: findTargetId(edges, TMDB_PROVIDERS),
      imdb: findTargetId(edges, IMDB_PROVIDERS),
      tvdb: findTargetId(edges, TVDB_PROVIDERS),
      anilist: item?.anilist || null,
    });
  }

  return result;
}

function findTargetId(edges, providers) {
  for (const edge of edges) {
    const provider = String(edge?.target_provider || "").toLowerCase();
    const id = String(edge?.target_entry_id || "").trim();
    if (providers.has(provider) && id) return id;
  }
  return null;
}

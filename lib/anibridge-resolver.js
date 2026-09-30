const ANIBRIDGE_MAPPINGS_URL = "https://mappings.anibridge.eliasbenb.dev/api/v3/mappings";
const MAX_BATCH_SIZE = 50;
const MAX_CONCURRENCY = 10;

const PROVIDER_PRIORITY = [
  ["tmdb", new Set(["tmdb", "tmdb_show"])],
  ["imdb", new Set(["imdb", "imdb_show"])],
  ["tvdb", new Set(["tvdb", "tvdb_show"])],
];

export async function resolveAniListMappings(anilistIds, fetchImpl = fetch) {
  const ids = [...new Set(
    (Array.isArray(anilistIds) ? anilistIds : [anilistIds])
      .map((id) => String(id ?? "").trim())
      .filter((id) => /^\d+$/.test(id)),
  )].slice(0, MAX_BATCH_SIZE);

  const result = new Map();
  if (!ids.length) return result;

  let nextIndex = 0;
  async function worker() {
    while (nextIndex < ids.length) {
      const id = ids[nextIndex++];
      try {
        const mapping = await fetchAniListMapping(id, fetchImpl);
        if (mapping) result.set(id, mapping);
      } catch (error) {
        console.warn("[catalog] AniBridge mapping lookup failed", { anilistId: id, error });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, ids.length) }, () => worker()),
  );

  return result;
}

async function fetchAniListMapping(anilistId, fetchImpl) {
  const url = new URL(ANIBRIDGE_MAPPINGS_URL);
  url.searchParams.set("provider", "anilist");
  url.searchParams.set("id", anilistId);

  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`AniBridge HTTP ${response.status}`);
  }

  const data = json?.data?.[`anilist:${anilistId}`];
  if (!data || typeof data !== "object") return null;

  const mapping = { tmdb: null, imdb: null, tvdb: null };
  for (const descriptor of Object.keys(data)) {
    const parsed = parseDescriptor(descriptor);
    if (!parsed) continue;

    for (const [name, providers] of PROVIDER_PRIORITY) {
      if (!mapping[name] && providers.has(parsed.provider)) {
        mapping[name] = parsed.id;
        break;
      }
    }
  }

  if (!mapping.tmdb && !mapping.imdb && !mapping.tvdb) return null;
  return mapping;
}

function parseDescriptor(descriptor) {
  const match = String(descriptor).match(/^([^:]+):([^:]+)(?::(.+))?$/);
  if (!match) return null;
  return { provider: match[1].toLowerCase(), id: match[2], scope: match[3] || null };
}

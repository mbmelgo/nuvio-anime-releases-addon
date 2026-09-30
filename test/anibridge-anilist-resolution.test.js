import assert from "node:assert/strict";
import test from "node:test";
import { resolveAniListMappings } from "../lib/anibridge-resolver.js";

test("AniBridge v3 resolves each AniList ID through the v3 mapping endpoint", async () => {
  const requests = [];
  const responses = {
    "185874": {
      "anilist:185874": {
        "anidb:19079:R": { "1-": "1-" },
        "mal:60636": { "1-": "1-" },
        "tmdb_show:30984:s2": { "1-": "41-" },
        "tvdb_show:74796:s17": { "1-": "41-" },
      },
    },
    "166254": {
      "anilist:166254": {
        "imdb_show:tt28399462:s1": { "1-": "1-" },
      },
    },
  };

  const result = await resolveAniListMappings([185874, 166254], async (url) => {
    const parsed = new URL(url);
    requests.push(parsed);
    const id = parsed.searchParams.get("id");
    return new Response(JSON.stringify({
      pagination: { limit: 50, offset: 0, total: 1, returned: 1 },
      data: responses[id] || {},
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  assert.deepEqual(requests.map((url) => [
    url.origin + url.pathname,
    url.searchParams.get("provider"),
    url.searchParams.get("id"),
  ]).sort(), [
    ["https://mappings.anibridge.eliasbenb.dev/api/v3/mappings", "anilist", "166254"],
    ["https://mappings.anibridge.eliasbenb.dev/api/v3/mappings", "anilist", "185874"],
  ]);

  assert.deepEqual(result.get("185874"), { tmdb: "30984", imdb: null, tvdb: "74796" });
  assert.deepEqual(result.get("166254"), { tmdb: null, imdb: "tt28399462", tvdb: null });
});

test("AniBridge v3 ignores missing mappings and invalid IDs without failing the page", async () => {
  const requests = [];
  const result = await resolveAniListMappings(["185874", "missing", 185874, "not-an-id"], async (url) => {
    const parsed = new URL(url);
    requests.push(parsed.searchParams.get("id"));
    return new Response(JSON.stringify({
      pagination: { limit: 50, offset: 0, total: 0, returned: 0 },
      data: {},
    }), { status: 200 });
  });

  assert.deepEqual(requests.sort(), ["185874", "missing"]);
  assert.equal(result.size, 0);
});

test("AniBridge v3 continues resolving other IDs when one lookup fails", async () => {
  const result = await resolveAniListMappings([185874, 166254], async (url) => {
    const id = new URL(url).searchParams.get("id");
    if (id === "185874") return new Response("server error", { status: 500 });
    return new Response(JSON.stringify({
      data: { "anilist:166254": { "imdb_show:tt28399462:s1": { "1-": "1-" } } },
    }), { status: 200 });
  });

  assert.equal(result.has("185874"), false);
  assert.deepEqual(result.get("166254"), { tmdb: null, imdb: "tt28399462", tvdb: null });
});

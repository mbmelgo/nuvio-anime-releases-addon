import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key));
    if (!route) return new Response(JSON.stringify({}), { status: 404 });
    return new Response(JSON.stringify(route.body), { status: route.status || 200 });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

for (const [anilistId, title, tvdbId] of [
  [204466, "Kaiju Girl Caramelise", "471878"],
  [181346, "Tomb Raider King", "452039"],
]) {
  test(`uses AniBridge TVDB mapping for ${title}`, async () => {
    const fetchImpl = mockFetch([
      {
        match: (url) => url.includes("mappings.anibridge.eliasbenb.dev") && url.includes(`provider=anilist`) && url.includes(`id=${anilistId}`),
        body: { data: { [`anilist:${anilistId}`]: { [`tvdb_show:${tvdbId}:s1`]: {} } } },
      },
    ]);
    const [meta] = await canonicalizeCatalogMetas([{ id: `anilist:${anilistId}`, name: title, type: "series" }], { fetchImpl, now: 1000 });
    assert.equal(meta.id, `tvdb:${tvdbId}`);
  });
}

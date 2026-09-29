import test from "node:test";
import assert from "node:assert/strict";
import { clearCanonicalizationCache, resolveWithTvdbWebSearchByTitle } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key));
    if (!route) return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(route.body), { status: route.status || 200, headers: { "Content-Type": "application/json" } });
  };
}

test.beforeEach(() => clearCanonicalizationCache());

test("recovers an exact TVDB series identity from the public title-search endpoint", async () => {
  const fetchImpl = mockFetch([
    {
      match: (url) => url.includes("api4.thetvdb.com/web/search/queries"),
      body: {
        results: [
          {
            hits: [
              { id: "series-359424", name: "Sazae-san", type: "series" },
              { id: "movie-196106", name: "Sazae-san", type: "movie" },
            ],
          },
        ],
      },
    },
  ]);
  const tvdbId = await resolveWithTvdbWebSearchByTitle(["Sazae-san", "サザエさん"], fetchImpl, 1000);
  assert.equal(tvdbId, "359424");
});

test("rejects non-exact title results from the TVDB search endpoint", async () => {
  const fetchImpl = mockFetch([
    {
      match: (url) => url.includes("api4.thetvdb.com/web/search/queries"),
      body: {
        results: [{ hits: [{ id: "series-123", name: "Sazae-san Movie", type: "series" }] }],
      },
    },
  ]);
  const tvdbId = await resolveWithTvdbWebSearchByTitle(["Sazae-san"], fetchImpl, 1000);
  assert.equal(tvdbId, null);
});

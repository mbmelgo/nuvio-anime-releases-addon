import test from "node:test";
import assert from "node:assert/strict";
import { clearCanonicalizationCache, resolveWithTvdbWebSearchByTitle } from "../lib/kitsu-canonical.js";

function mockFetch(routes) {
  return async (url, options = {}) => {
    const key = new URL(url).toString();
    const route = routes.find((entry) => entry.match(key, options));
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

test("tries all title variants when the first TVDB search title has no exact result", async () => {
  const queries = [];
  const fetchImpl = mockFetch([
    {
      match: (url) => url.includes("api4.thetvdb.com/web/search/queries"),
      body: { results: [{ hits: [] }] },
    },
  ]);
  const originalFetch = fetchImpl;
  const trackingFetch = async (url, options = {}) => {
    const body = options?.body ? JSON.parse(options.body) : null;
    queries.push(body?.requests?.[0]?.params?.query);
    if (queries.length === 2) {
      return new Response(JSON.stringify({ results: [{ hits: [{ id: "series-359424", name: "サザエさん", type: "series" }] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return originalFetch(url, options);
  };
  const tvdbId = await resolveWithTvdbWebSearchByTitle(["Sazae-san", "サザエさん"], trackingFetch, 1000);
  assert.equal(tvdbId, "359424");
  assert.deepEqual(queries, ["Sazae-san", "サザエさん"]);
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

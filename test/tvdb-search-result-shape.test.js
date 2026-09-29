import test from "node:test";
import assert from "node:assert/strict";
import { clearCanonicalizationCache, resolveWithTvdbWebSearchByTitle } from "../lib/kitsu-canonical.js";

test.beforeEach(() => clearCanonicalizationCache());

test("accepts the object-shaped results returned by the TVDB web search endpoint", async () => {
  const fetchImpl = async (url) => {
    assert.match(new URL(url).hostname, /api4\.thetvdb\.com/);
    return new Response(JSON.stringify({
      results: {
        "0": {
          hits: [
            { id: "series-359424", name: "Sazae-san", type: "series" },
          ],
        },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  assert.equal(await resolveWithTvdbWebSearchByTitle(["Sazae-san"], fetchImpl, 1000), "359424");
});

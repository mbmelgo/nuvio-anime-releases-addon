import test from "node:test";
import assert from "node:assert/strict";
import { findValidatedTvdbCandidate } from "../lib/canonical-validation.js";

test("falls back to the exact TVDB series page when fuzzy search only returns a franchise candidate", async () => {
  const fetchImpl = async (url) => {
    if (url.includes("api4.thetvdb.com/web/search/queries")) {
      return new Response(JSON.stringify({ results: [{ hits: [{ id: "series-7789", type: "series", name: "Pokémon", aliases: ["Pokemon"], first_air_time: "1997-04-01" }] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/series/")) {
      return new Response("TheTVDB.com Series ID: 433862", { status: 200, headers: { "Content-Type": "text/html" } });
    }
    return new Response("", { status: 404 });
  };

  const result = await findValidatedTvdbCandidate([
    "Pokémon Horizons: The Series",
    "Pocket Monsters (2023)",
    "ポケットモンスター (2023)",
  ], 2023, fetchImpl);

  assert.equal(result.status, "found");
  assert.equal(result.tvdbId, "433862");
});

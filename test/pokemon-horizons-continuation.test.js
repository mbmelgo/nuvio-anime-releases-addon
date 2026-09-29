import test from "node:test";
import assert from "node:assert/strict";
import { findValidatedTvdbCandidate } from "../lib/canonical-validation.js";

test("does not accept a fuzzy franchise result before searching the remaining title variants", async () => {
  const queries = [];
  const fetchImpl = async (url, options = {}) => {
    const body = JSON.parse(String(options.body || "{}"));
    const query = body?.requests?.[0]?.params?.query || "";
    queries.push(query);
    const hits = query.includes("Pokémon Horizons")
      ? [{ id: "series-410040", type: "series", name: "Pokémon Horizons", aliases: ["Pokemon Horizons"], first_air_time: "2023-04-14" }]
      : [{ id: "series-7789", type: "series", name: "Pokémon", aliases: ["Pokemon"], first_air_time: "1997-04-01" }];
    return new Response(JSON.stringify({ results: [{ hits }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await findValidatedTvdbCandidate([
    "Pokémon Horizons: The Series",
    "Pokémon Horizons",
    "ポケットモンスター (2023)",
  ], 2023, fetchImpl);

  assert.equal(result.status, "found");
  assert.equal(result.tvdbId, "410040");
  assert.ok(queries.length > 1);
});

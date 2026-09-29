import test from "node:test";
import assert from "node:assert/strict";
import { recoverContinuingTvdbSeries } from "../lib/canonical-season-recovery.js";

test("does not treat The Series as a numbered continuation marker", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      results: [{ hits: [{ id: "series-7789", type: "series", name: "Pokémon", aliases: ["Pokemon"] }] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await recoverContinuingTvdbSeries([
    "Pokémon Horizons: The Series",
    "Pokémon Horizons",
    "ポケットモンスター (2023)",
  ], fetchImpl);

  assert.equal(result.status, "not_applicable");
  assert.equal(result.tvdbId, null);
  assert.equal(calls, 0);
});

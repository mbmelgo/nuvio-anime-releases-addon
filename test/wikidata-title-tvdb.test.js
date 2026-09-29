import test from "node:test";
import assert from "node:assert/strict";
import { resolveWithWikidataSearchApiByTitle } from "../lib/kitsu-canonical.js";

test("resolves TVDB identity through the public Wikidata search/entity APIs", async () => {
  const fetchImpl = async (url) => {
    const value = new URL(url).toString();
    if (value.startsWith("https://www.wikidata.org/w/api.php")) return new Response(JSON.stringify({ search: [{ id: "Q1140442", label: "Sazae-san" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    if (value === "https://www.wikidata.org/wiki/Special:EntityData/Q1140442.json") return new Response(JSON.stringify({ entities: { Q1140442: { claims: { P4835: [{ mainsnak: { datavalue: { value: "359424" } } }] } } } }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({}), { status: 404, headers: { "Content-Type": "application/json" } });
  };
  const tvdbId = await resolveWithWikidataSearchApiByTitle(["Sazae-san", "サザエさん"], fetchImpl, 1000);
  assert.equal(tvdbId, "359424");
});

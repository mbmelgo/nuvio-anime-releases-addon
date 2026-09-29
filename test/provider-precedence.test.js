import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

test.beforeEach(() => clearCanonicalizationCache());

test("prefers the AniList TVDB mapping when MAL points to a franchise-level identity", async () => {
  const fetchImpl = async (url) => {
    const target = new URL(String(url));
    if (target.hostname === "api4.thetvdb.com") {
      return new Response(JSON.stringify({ results: [{ hits: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (target.hostname === "query.wikidata.org") {
      const query = target.searchParams.get("query") || "";
      if (query.includes("P8729") && query.includes("158871")) {
        return new Response(JSON.stringify({ results: { bindings: [{ tvdb: { value: "433862" } }] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
      }
      if (query.includes("P4086") && query.includes("53876")) {
        return new Response(JSON.stringify({ results: { bindings: [{ tvdb: { value: "76703" } }] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
      }
      return new Response(JSON.stringify({ results: { bindings: [] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };

  const [meta] = await canonicalizeCatalogMetas([{
    id: "mal:53876",
    name: "Pokémon Horizons",
    extra: {
      anilistId: "158871",
      titleEnglish: "Pokémon Horizons",
      titleRomaji: "Pokemon Horizons",
      titleNative: "ポケットモンスター",
    },
  }], { fetchImpl });

  assert.equal(meta.id, "tvdb:433862");
});

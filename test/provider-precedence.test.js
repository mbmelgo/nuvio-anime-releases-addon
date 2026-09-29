import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

test.beforeEach(() => clearCanonicalizationCache());

test("prefers the AniList TVDB mapping when MAL points to a franchise-level identity", async () => {
  const fetchImpl = async (url, options = {}) => {
    const target = String(url);
    if (target.includes("api4.thetvdb.com/web/search/queries")) {
      return new Response(JSON.stringify({ results: [{ hits: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (target.includes("query.wikidata.org")) {
      const body = String(options.body || "");
      if (body.includes('P8729') && body.includes('158871')) {
        return new Response(JSON.stringify({ results: { bindings: [{ tvdb: { value: "433862" } }] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
      }
      if (body.includes('P4086') && body.includes('53876')) {
        return new Response(JSON.stringify({ results: { bindings: [{ tvdb: { value: "76703" } }] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
      }
      return new Response(JSON.stringify({ results: { bindings: [] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
    }
    if (target.includes("arm")) return new Response(JSON.stringify({}), { status: 200 });
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

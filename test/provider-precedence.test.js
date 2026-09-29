import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas } from "../lib/canonical-identity.js";

function mockFetch() {
  return async (url) => {
    const target = new URL(String(url));
    if (target.hostname === "api4.thetvdb.com") {
      return new Response(JSON.stringify({ results: [{ hits: [] }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (target.hostname === "query.wikidata.org") {
      return new Response(JSON.stringify({ results: { bindings: [] } }), { status: 200, headers: { "Content-Type": "application/sparql-results+json" } });
    }
    if (target.hostname === "mappings.anibridge.eliasbenb.dev") {
      const source = target.searchParams.get("provider");
      const id = target.searchParams.get("id");
      const tvdb = source === "anilist" && id === "158871" ? "433862" : source === "mal" && id === "53876" ? "76703" : null;
      return new Response(JSON.stringify({ data: tvdb ? { [`${source}:${id}`]: { [`tvdb_show:${tvdb}`]: {} } } : {} }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 404 });
  };
}

test("prefers the AniList TVDB mapping when MAL points to a franchise-level identity", async () => {
  const [meta] = await canonicalizeCatalogMetas([{
    id: "mal:53876",
    name: "Pokémon Horizons",
    extra: {
      anilistId: "158871",
      titleEnglish: "Pokémon Horizons",
      titleRomaji: "Pokemon Horizons",
      titleNative: "ポケットモンスター",
    },
  }], { fetchImpl: mockFetch() });

  assert.equal(meta.id, "tvdb:433862");
});

import test from "node:test";
import assert from "node:assert/strict";
import { resolveExternalMetadataIdsByTitle } from "../lib/external-title-ids.js";

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("resolves unique TMDB and IMDb identities from an exact Wikidata title", async () => {
  const fetchImpl = async (url) => {
    assert.match(String(url), /Pok%C3%A9mon/);
    assert.match(String(url), /%3A/);
    return response({ results: { bindings: [{ item: { value: "https://www.wikidata.org/entity/Q115733264" }, tmdb: { value: "220150" }, imdb: { value: "tt26692417" } }] } });
  };
  assert.deepEqual(await resolveExternalMetadataIdsByTitle(["Pokémon Horizons: The Series"], fetchImpl), { tmdb: "220150", imdb: "tt26692417" });
});

test("rejects ambiguous exact-title external identity matches", async () => {
  const fetchImpl = async () => response({ results: { bindings: [
    { item: { value: "https://www.wikidata.org/entity/Q1" }, tmdb: { value: "100" } },
    { item: { value: "https://www.wikidata.org/entity/Q2" }, tmdb: { value: "200" } },
  ] } });
  assert.deepEqual(await resolveExternalMetadataIdsByTitle(["Duplicate Title"], fetchImpl), { tmdb: null, imdb: null });
});

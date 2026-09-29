import test from "node:test";
import assert from "node:assert/strict";
import { resolveExternalMetadataIdsByAniListId, selectExternalMetadataIds } from "../lib/external-title-ids.js";

test("resolves external metadata identities from an AniList-linked Wikidata entity", async () => {
  const fetchImpl = async () => ({ results: { bindings: [
    { item: { value: "https://www.wikidata.org/entity/Q115733264" }, label: { value: "Pokémon Horizons: The Series" }, tmdb: { value: "220150" }, imdb: { value: "tt26692417" } },
    { item: { value: "https://www.wikidata.org/entity/Q999999999" }, label: { value: "Pokémon" }, tmdb: { value: "76148" } },
  ] } });
  assert.deepEqual(await resolveExternalMetadataIdsByAniListId("158871", ["Pokémon Horizons: The Series"], fetchImpl), { tmdb: "220150", imdb: "tt26692417" });
});

test("selects the uniquely title-matching identity when an external ID is duplicated", () => {
  assert.deepEqual(selectExternalMetadataIds([
    { item: { value: "https://www.wikidata.org/entity/Q1" }, label: { value: "Pokémon" }, tmdb: { value: "100" } },
    { item: { value: "https://www.wikidata.org/entity/Q2" }, label: { value: "Pokémon Horizons: The Series" }, tmdb: { value: "220150" }, imdb: { value: "tt26692417" } },
  ], ["Pokémon Horizons: The Series"]), { tmdb: "220150", imdb: "tt26692417" });
});

test("rejects ambiguous exact-title external identity matches", () => {
  assert.deepEqual(selectExternalMetadataIds([
    { item: { value: "https://www.wikidata.org/entity/Q1" }, label: { value: "Duplicate Title" }, tmdb: { value: "100" } },
    { item: { value: "https://www.wikidata.org/entity/Q2" }, label: { value: "Duplicate Title" }, tmdb: { value: "200" } },
  ], ["Duplicate Title"]), { tmdb: null, imdb: null });
});

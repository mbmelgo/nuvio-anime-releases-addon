import test from "node:test";
import assert from "node:assert/strict";
import { resolveExternalMetadataIdsByAniListId, selectExternalMetadataIds } from "../lib/external-title-ids.js";

test("resolves external metadata identities from an AniList-linked Wikidata entity", async () => {
  const fetchImpl = async () => ({ results: { bindings: [{ item: { value: "https://www.wikidata.org/entity/Q115733264" }, tmdb: { value: "220150" }, imdb: { value: "tt26692417" } }] } });
  assert.deepEqual(await resolveExternalMetadataIdsByAniListId("158871", fetchImpl), { tmdb: "220150", imdb: "tt26692417" });
});

test("selects unique TMDB and IMDb identities from an exact Wikidata title result", () => {
  assert.deepEqual(selectExternalMetadataIds([{ item: { value: "https://www.wikidata.org/entity/Q115733264" }, tmdb: { value: "220150" }, imdb: { value: "tt26692417" } }]), { tmdb: "220150", imdb: "tt26692417" });
});

test("rejects ambiguous exact-title external identity matches", () => {
  assert.deepEqual(selectExternalMetadataIds([
    { item: { value: "https://www.wikidata.org/entity/Q1" }, tmdb: { value: "100" } },
    { item: { value: "https://www.wikidata.org/entity/Q2" }, tmdb: { value: "200" } },
  ]), { tmdb: null, imdb: null });
});

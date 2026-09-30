import assert from "node:assert/strict";
import test from "node:test";
import { selectExternalMetadataIds } from "../lib/external-title-ids.js";

test("external identity selection chooses the exact title when AniList maps to multiple Wikidata items", () => {
  const result = selectExternalMetadataIds([
    {
      item: { value: "https://www.wikidata.org/entity/QWRONG" },
      label: { value: "Example Franchise" },
      tvdb: { value: "100" },
    },
    {
      item: { value: "https://www.wikidata.org/entity/QRIGHT" },
      label: { value: "Example Anime" },
      tmdb: { value: "200" },
    },
  ], ["Example Anime"]);

  assert.deepEqual(result, { tmdb: "200", imdb: null, tvdb: null });
});

test("external identity selection rejects ambiguous exact-title matches from different entities", () => {
  const result = selectExternalMetadataIds([
    {
      item: { value: "https://www.wikidata.org/entity/Q1" },
      label: { value: "Example Anime" },
      tvdb: { value: "100" },
    },
    {
      item: { value: "https://www.wikidata.org/entity/Q2" },
      label: { value: "Example Anime" },
      tmdb: { value: "200" },
    },
  ], ["Example Anime"]);

  assert.deepEqual(result, { tmdb: null, imdb: null });
});

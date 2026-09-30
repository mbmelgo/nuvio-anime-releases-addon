import assert from "node:assert/strict";
import test from "node:test";
import { selectExternalMetadataIdsForAniListId } from "../lib/external-title-ids.js";

test("batched external identity resolution accepts the unique Wikidata entity for an exact AniList ID", () => {
  const result = selectExternalMetadataIdsForAniListId([
    {
      anilist: { value: "123" },
      item: { value: "https://www.wikidata.org/entity/Q123" },
      label: { value: "The Correct Anime Title" },
      tvdb: { value: "456" },
      tmdb: { value: "789" },
    },
  ], "123", ["Different Display Title"]);

  assert.deepEqual(result, { tmdb: "789", imdb: null, tvdb: "456" });
});

test("batched external identity resolution rejects an ambiguous AniList ID mapped to multiple Wikidata entities", () => {
  const result = selectExternalMetadataIdsForAniListId([
    {
      anilist: { value: "123" },
      item: { value: "https://www.wikidata.org/entity/Q1" },
      label: { value: "Anime One" },
      tvdb: { value: "111" },
    },
    {
      anilist: { value: "123" },
      item: { value: "https://www.wikidata.org/entity/Q2" },
      label: { value: "Anime Two" },
      tmdb: { value: "222" },
    },
  ], "123", ["Anime One"]);

  assert.deepEqual(result, { tmdb: null, imdb: null });
});

import assert from "node:assert/strict";
import test from "node:test";
import { delegateCompatibleIds, selectUniqueWikidataMappings } from "../api/catalog-delegation.js";

test("catalog delegation preserves every catalog entry and its source identity", async () => {
  const input = [
    { id: "mal:21", type: "series", name: "One Piece" },
    { id: "mal:50307", type: "series", name: "Digimon Beatbreak" },
    { id: "mal:235", type: "series", name: "Detective Conan" },
    { id: "mal:2471", type: "series", name: "Doraemon" },
    { id: "mal:28211", type: "series", name: "Beyblade X" },
  ];

  const result = await delegateCompatibleIds(input);

  assert.equal(result.length, input.length);
  assert.deepEqual(result.map((meta) => meta.id), input.map((meta) => meta.id));
  assert.deepEqual(result.map((meta) => meta.name), input.map((meta) => meta.name));
});

test("catalog delegation never replaces a TV series with a related movie or franchise entry", async () => {
  const input = [
    { id: "mal:21", type: "series", name: "One Piece" },
    { id: "mal:235", type: "series", name: "Detective Conan" },
    { id: "mal:2471", type: "series", name: "Doraemon" },
    { id: "mal:50307", type: "series", name: "Digimon Beatbreak" },
    { id: "mal:28211", type: "series", name: "Beyblade X" },
  ];

  const result = await delegateCompatibleIds(input);

  for (let index = 0; index < input.length; index += 1) {
    assert.equal(result[index].id, input[index].id);
    assert.equal(result[index].type, "series");
  }
});

test("catalog delegation preserves unmapped and season-specific source identities", async () => {
  const input = [
    { id: "mal:52976", type: "series", name: "The Elusive Samurai Season 2" },
    { id: "mal:54858", type: "series", name: "Re:ZERO Season 4" },
    { id: "mal:59955", type: "series", name: "Saga of Tanya the Evil Season 2" },
    { id: "mal:55849", type: "series", name: "From Old Country Bumpkin to Master Swordsman II" },
  ];

  const result = await delegateCompatibleIds(input);

  assert.deepEqual(result, input);
});

test("catalog delegation does not allow title-only Wikidata matches to create identities", () => {
  const result = selectUniqueWikidataMappings([
    { label: { value: "One Piece" }, imdb: { value: "tt0388629" } },
    { label: { value: "Daemons of the Shadow Realm" }, imdb: { value: "tt12345678" } },
  ]);

  assert.equal(result.size, 0);
});

test("catalog delegation is a pure identity-preservation boundary", async () => {
  const input = [
    { id: "mal:269", type: "series", name: "Bleach" },
    { id: "anilist:154587", type: "series", name: "Example Anime" },
  ];

  const result = await delegateCompatibleIds(input);

  assert.strictEqual(result, input);
});

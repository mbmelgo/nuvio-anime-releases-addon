import test from "node:test";
import assert from "node:assert/strict";
import { ANILIST_PAGE_SIZE, NUVIO_PAGE_SIZE, catalogDefinitions } from "../lib/catalog-config.js";

test("catalog pagination uses 50 upstream records and 50 Nuvio records", () => {
  assert.equal(ANILIST_PAGE_SIZE, 50);
  assert.equal(NUVIO_PAGE_SIZE, 50);

  const definitions = catalogDefinitions({
    ongoing: { season: "FALL", year: 2026 },
    previous: { season: "SUMMER", year: 2026 },
    upcoming: { season: "WINTER", year: 2027 },
  });

  assert.equal(definitions.length, 5);
  for (const definition of definitions) {
    assert.equal(definition.type, "anime");
    assert.equal(definition.pageSize, 50);
  }
});

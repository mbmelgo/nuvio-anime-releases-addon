import assert from "node:assert/strict";
import test from "node:test";
import { filterCatalogMetasBySearch, catalogDefinitions } from "../api/catalog-source.js";

test("all user-facing catalogs advertise optional search support", () => {
  for (const catalog of catalogDefinitions({ ongoing: { season: "SUMMER", year: 2026 }, previous: { season: "SPRING", year: 2026 }, upcoming: { season: "FALL", year: 2026 } })) {
    assert.deepEqual(catalog.extra, [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }]);
  }
});

test("search matches English, Romaji, and native titles", () => {
  const metas = [
    { name: "The Elusive Samurai", extra: { titleEnglish: "The Elusive Samurai", titleRomaji: "Nige Jouzu no Wakagimi", titleNative: "逃げ上手の若君" } },
    { name: "Bleach", extra: { titleEnglish: "BLEACH", titleRomaji: "Bleach", titleNative: "ブリーチ" } },
  ];
  assert.equal(filterCatalogMetasBySearch(metas, "elusive").length, 1);
  assert.equal(filterCatalogMetasBySearch(metas, "nige jouzu").length, 1);
  assert.equal(filterCatalogMetasBySearch(metas, "逃げ上手").length, 1);
  assert.equal(filterCatalogMetasBySearch(metas, "ブリーチ").length, 1);
  assert.equal(filterCatalogMetasBySearch(metas, "does-not-exist").length, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { buildManifest, normalizeResolver } from "../api/resolver-manifest.js";
import { ADDON_VERSION } from "../api/version.js";

const seasonInfo = {
  ongoing: { season: "SUMMER", year: 2026 },
  previous: { season: "SPRING", year: 2026 },
  upcoming: { season: "FALL", year: 2026 },
};

test("resolver manifest: v4 and v5 normalize to distinct addon IDs", () => {
  const v4 = buildManifest(seasonInfo, "v4");
  const v5 = buildManifest(seasonInfo, "v5");

  assert.equal(v4.version, ADDON_VERSION);
  assert.equal(v5.version, ADDON_VERSION);
  assert.equal(v4.id, "com.marki.nuvio.anime-releases.v4");
  assert.equal(v5.id, "com.marki.nuvio.anime-releases.v5");
  assert.notEqual(v4.id, v5.id);
  assert.match(v4.description, /v4/);
  assert.match(v5.description, /v5/);
});

test("resolver manifest: invalid resolver safely falls back to v4", () => {
  assert.equal(normalizeResolver("v4"), "v4");
  assert.equal(normalizeResolver("V5"), "v5");
  assert.equal(normalizeResolver("unknown"), "v4");
  assert.equal(normalizeResolver(undefined), "v4");
});

test("resolver manifest: both variants expose the same catalog contract", () => {
  const v4 = buildManifest(seasonInfo, "v4");
  const v5 = buildManifest(seasonInfo, "v5");

  assert.deepEqual(v4.catalogs, v5.catalogs);
  assert.deepEqual(v4.resources, v5.resources);
  assert.deepEqual(v4.types, v5.types);
});

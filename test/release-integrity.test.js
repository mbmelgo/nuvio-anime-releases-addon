import assert from "node:assert/strict";
import test from "node:test";
import {
  compareVersions,
  incrementMinor,
  validateVersionConsistency,
  validateRepositoryReleaseState,
} from "../scripts/release-integrity.mjs";
import {
  PRODUCTION_CATALOG_IDS,
  validateCatalog,
  validateManifest,
} from "../scripts/validate-production.mjs";

test("repository release metadata is internally consistent", () => {\n  assert.equal(validateRepositoryReleaseState(), true);\n});\n\ntest("release version helpers enforce semantic versioning and minor baselines", () => {
  assert.equal(compareVersions("5.5.3", "5.5.0") > 0, true);
  assert.equal(compareVersions("5.5.0", "5.5.0"), 0);
  assert.equal(incrementMinor("5.5.3"), "5.6.0");
});

test("release state rejects inconsistent production and development metadata", () => {
  assert.throws(
    () => validateVersionConsistency({
      addonVersion: "5.5.3",
      packageVersion: "5.5.2",
      productionVersion: "5.5.0",
      productionTag: "v5.5.0",
      nextReleaseVersion: "5.6.0",
      deploymentsSincePause: 6,
      deploymentLimit: 10,
      paused: false,
    }),
    /does not match/,
  );

  assert.throws(
    () => validateVersionConsistency({
      addonVersion: "5.5.3",
      packageVersion: "5.5.3",
      productionVersion: "5.5.0",
      productionTag: "v5.5.0",
      nextReleaseVersion: "5.7.0",
      deploymentsSincePause: 6,
      deploymentLimit: 10,
      paused: false,
    }),
    /Next release/,
  );

  assert.equal(validateVersionConsistency({
    addonVersion: "5.5.3",
    packageVersion: "5.5.3",
    productionVersion: "5.5.0",
    productionTag: "v5.5.0",
    nextReleaseVersion: "5.6.0",
    deploymentsSincePause: 6,
    deploymentLimit: 10,
    paused: false,
  }), true);
});

test("production manifest validator enforces the exact five-catalog contract", () => {
  const manifest = {
    id: "com.marki.nuvio.anime-releases",
    version: "5.5.3",
    identityMode: "mal",
    resources: [{ name: "catalog", types: ["anime"] }],
    types: ["anime"],
    catalogs: PRODUCTION_CATALOG_IDS.map((id) => ({ id, type: "anime" })),
  };
  assert.equal(validateManifest(manifest, "5.5.3"), true);
  assert.throws(() => validateManifest({
    ...manifest,
    catalogs: manifest.catalogs.slice(0, 4),
  }, "5.5.3"), /five supported catalogs/);
});

test("production catalog validator enforces unique series identities", () => {
  assert.equal(validateCatalog({
    metas: [
      { id: "mal:1", type: "series" },
      { id: "anilist:2", type: "series" },
    ],
  }, "current_season"), true);

  assert.throws(() => validateCatalog({
    metas: [
      { id: "mal:1", type: "series" },
      { id: "mal:1", type: "series" },
    ],
  }, "current_season"), /duplicate/);

  assert.throws(() => validateCatalog({
    metas: [{ id: "tvdb:1", type: "series" }],
  }, "current_season"), /invalid catalog identity/);
});

test("production rolling catalog validators enforce their distinct metadata contracts", () => {
  assert.equal(validateCatalog({
    metas: [{ id: "mal:1", type: "series", extra: { nextEpisode: 2, nextAiringAt: 123 } }],
  }, "upcoming_5_days"), true);

  assert.throws(() => validateCatalog({
    metas: [{ id: "mal:1", type: "series", extra: { nextEpisode: 2 } }],
  }, "upcoming_5_days"), /next episode and next airing/);

  assert.equal(validateCatalog({
    metas: [{ id: "mal:1", type: "series", extra: {} }],
  }, "previous_7_days"), true);

  assert.throws(() => validateCatalog({
    metas: [{ id: "mal:1", type: "series", extra: { nextEpisode: 2, nextAiringAt: 123 } }],
  }, "previous_7_days"), /future-only/);
});

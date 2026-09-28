import test from "node:test";
import assert from "node:assert/strict";
import { minorReleaseVersion, nextMinorDevelopmentVersion } from "../lib/release-version.js";

test("minor release tag uses the current major/minor baseline, not the patch version", () => {
  assert.equal(minorReleaseVersion("2.14.10"), "2.14.0");
  assert.equal(minorReleaseVersion("2.14.99"), "2.14.0");
  assert.equal(minorReleaseVersion("3.7.4"), "3.7.0");
});

test("next development baseline advances the minor version", () => {
  assert.equal(nextMinorDevelopmentVersion("2.14.10"), "2.15.0");
  assert.equal(nextMinorDevelopmentVersion("3.7.4"), "3.8.0");
});

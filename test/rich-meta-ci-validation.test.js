import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCertification, formatReleaseInfo } from "../api/lib/rich-meta.js";

test("rich metadata helpers pass CI validation", () => {
  assert.equal(formatReleaseInfo("2021-01-01T00:00:00Z", null), "2021-");
  assert.equal(normalizeCertification("R - 17+ (violence & profanity)"), "R");
});

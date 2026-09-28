import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");
const recoveryWorkflow = fs.readFileSync(new URL("../.github/workflows/tag-backfill.yml", import.meta.url), "utf8");
const historicalTags = JSON.parse(fs.readFileSync(new URL("../ops/historical-release-tags.json", import.meta.url), "utf8"));

test("production deployment workflow creates the annotated release tag after deployment smoke tests", () => {
  assert.match(deployWorkflow, /tag-production-release:/);
  assert.match(deployWorkflow, /needs: deploy-production/);
  assert.match(deployWorkflow, /contains\(github\.event\.head_commit\.message, '\[deploy-prod\]'\)/);
  assert.match(deployWorkflow, /git tag -a \"\$tag\" \"\$target\"/);
  assert.match(deployWorkflow, /git push origin \"refs\/tags\/\$tag\"/);
});

test("historical release tag recovery is automatic when the backfill manifest changes", () => {
  assert.match(recoveryWorkflow, /workflow_dispatch:/);
  assert.match(recoveryWorkflow, /push:/);
  assert.match(recoveryWorkflow, /ops\/historical-release-tags\.json/);
  assert.match(recoveryWorkflow, /\"git\",\s*\"tag\",\s*\"-a\"/);
  assert.match(recoveryWorkflow, /\"git\",\s*\"push\",\s*\"origin\",\s*\"--tags\"/);
  assert.deepEqual(historicalTags.releases.map((release) => release.tag), ["v2.16.0", "v2.17.0", "v2.18.0"]);
  for (const release of historicalTags.releases) {
    assert.match(release.target, /^[0-9a-f]{40}$/);
    assert.match(release.summary, new RegExp(`Release ${release.tag}`));
  }
});

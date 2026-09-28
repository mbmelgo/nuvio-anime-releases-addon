import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");

test("production deployment workflow is gated on completed green CI", () => {
  assert.match(deployWorkflow, /workflow_run:/);
  assert.match(deployWorkflow, /workflows: \["Verify automatic version commits"\]/);
  assert.match(deployWorkflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(deployWorkflow, /contains\(github\.event\.workflow_run\.head_commit\.message, '\[deploy-prod\]'\)/);
});

test("production deployment workflow creates the annotated release tag after deployment smoke tests", () => {
  assert.match(deployWorkflow, /Create annotated release tag and update release state/);
  assert.match(deployWorkflow, /git tag -a \"\$tag\" \"\$target\"/);
  assert.match(deployWorkflow, /git push origin \"refs\/tags\/\$tag\"/);
});

test("production release tagging summarizes changes from the previous release tag", () => {
  assert.match(deployWorkflow, /git tag --merged \"\$target\^\"/);
  assert.match(deployWorkflow, /Changes since \$previous:/);
  assert.match(deployWorkflow, /git log --reverse --no-merges --pretty=format:/);
  assert.match(deployWorkflow, /Release \$tag/);
});

test("production smoke test enforces the canonical unversioned addon identity and routes", () => {
  assert.match(deployWorkflow, /https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/manifest\.json/);
  assert.match(deployWorkflow, /https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/catalog\/series\/ongoing\.json/);
  assert.match(deployWorkflow, /com\.marki\.nuvio\.anime-releases/);
  assert.doesNotMatch(deployWorkflow, /com\.marki\.nuvio\.anime-releases\.v5/);
  assert.doesNotMatch(deployWorkflow, /\/v5\//);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/test.yml", import.meta.url), "utf8");

test("production deployment workflow creates the annotated release tag after deployment smoke tests", () => {
  assert.match(deployWorkflow, /tag-production-release:/);
  assert.match(deployWorkflow, /needs: deploy-production/);
  assert.match(deployWorkflow, /contains\(github\.event\.head_commit\.message, '\[deploy-prod\]'\)/);
  assert.match(deployWorkflow, /git tag -a \"\$tag\" \"\$target\"/);
  assert.match(deployWorkflow, /git push origin \"refs\/tags\/\$tag\"/);
});

test("production release tagging summarizes changes from the previous release tag", () => {
  assert.match(deployWorkflow, /git tag --merged \"\$target\^\"/);
  assert.match(deployWorkflow, /Changes since \$previous:/);
  assert.match(deployWorkflow, /git log --reverse --no-merges --pretty=format:/);
  assert.match(deployWorkflow, /Release \$tag/);
});

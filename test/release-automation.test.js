import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/sync-version.yml", import.meta.url), "utf8");

test("release workflow exposes manual dispatch inputs", () => {
  assert.match(deployWorkflow, /workflow_dispatch:/);
  assert.match(deployWorkflow, /deploy_prod:/);
  assert.match(deployWorkflow, /finalize_release:/);
  assert.match(deployWorkflow, /release_target_sha:/);
});

test("release finalization validates the deployed target version", () => {
  assert.match(deployWorkflow, /git show[\\s\\S]*api\\/version\\.js/);
  assert.match(deployWorkflow, /Release target version.*next release baseline/);
});

test("release workflow runs CI before deployment", () => {
  assert.match(deployWorkflow, /Run full CI/);
  assert.match(deployWorkflow, /npm test/);
  assert.match(deployWorkflow, /\[deploy-prod\]/);
});

test("release workflow tags and summarizes the production release", () => {
  assert.match(deployWorkflow, /git tag -a \"\$tag\" \"\$target\"/);
  assert.match(deployWorkflow, /git tag --merged \"\$target\^\"/);
  assert.match(deployWorkflow, /git.*log.*--reverse.*--no-merges/);
  assert.match(deployWorkflow, /git push origin \"refs\/tags\/\$tag\"/);
});

test("release workflow contains one production smoke test and one release finalizer", () => {
  assert.equal((deployWorkflow.match(/- name: Production smoke test/g) || []).length, 1);
  assert.equal((deployWorkflow.match(/- name: Create annotated release tag, GitHub Release, and update release state/g) || []).length, 1);
  assert.doesNotMatch(deployWorkflow, /assert any\(m\.get\('id'\) == 'anilist:195604' for m in metas\)/);
  assert.doesNotMatch(deployWorkflow, /\n,str\(m\.get\('id',''\)\) for m in metas\)/);
});

test("release smoke test validates the MAL-primary catalog identity", () => {
  assert.match(deployWorkflow, /https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/manifest\.json/);
  assert.match(deployWorkflow, /https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/catalog\/anime\/current_season\.json/);
  assert.doesNotMatch(deployWorkflow, /\/catalog\/series\/ongoing\.json/);
  assert.match(deployWorkflow, /com\.marki\.nuvio\.anime-releases/);
  assert.doesNotMatch(deployWorkflow, /com\.marki\.nuvio\.anime-releases\.v5/);
  assert.doesNotMatch(deployWorkflow, /\/v5\//);
  assert.match(deployWorkflow, /mal:/);
  assert.match(deployWorkflow, /anilist:/);
  assert.match(deployWorkflow, /assert all\(m\.get\("type"\) == "series" for m in metas\)/);
});

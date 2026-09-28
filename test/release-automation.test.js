import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/sync-version.yml", import.meta.url), "utf8");
test("release workflow runs CI before deployment",()=>{assert.match(deployWorkflow,/Run full CI/);assert.match(deployWorkflow,/npm test/);assert.match(deployWorkflow,/\[deploy-prod\]/);});
test("release workflow tags and summarizes the production release",()=>{assert.match(deployWorkflow,/git tag -a \"\$tag\" \"\$target\"/);assert.match(deployWorkflow,/git tag --merged \"\$target\^\"/);assert.match(deployWorkflow,/git log --reverse --no-merges/);assert.match(deployWorkflow,/git push origin \"refs\/tags\/\$tag\"/);});
test("release smoke test enforces canonical unversioned identity and routes",()=>{assert.match(deployWorkflow,/https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/manifest\.json/);assert.match(deployWorkflow,/https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/catalog\/series\/ongoing\.json/);assert.match(deployWorkflow,/com\.marki\.nuvio\.anime-releases/);assert.doesNotMatch(deployWorkflow,/com\.marki\.nuvio\.anime-releases\.v5/);assert.doesNotMatch(deployWorkflow,/\/v5\//);});

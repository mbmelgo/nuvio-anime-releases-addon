import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const deployWorkflow = fs.readFileSync(new URL("../.github/workflows/sync-version.yml", import.meta.url), "utf8");
const verifyWorkflow = fs.readFileSync(new URL("../.github/workflows/verify-version-sync.yml", import.meta.url), "utf8");
test("release workflow runs CI before deployment",()=>{assert.match(deployWorkflow,/Run full CI/);assert.match(deployWorkflow,/npm test/);assert.match(deployWorkflow,/\[deploy-prod\]/);});
test("release workflow tags and summarizes the production release",()=>{assert.match(deployWorkflow,/git tag -a \"\$tag\" \"\$target\"/);assert.match(deployWorkflow,/git tag --merged \"\$target\^\"/);assert.match(deployWorkflow,/git.*log.*--reverse.*--no-merges/);assert.match(deployWorkflow,/git push origin \"refs\/tags\/\$tag\"/);});
test("release smoke test accepts every supported catalog identity prefix",()=>{assert.match(deployWorkflow,/https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/manifest\.json/);assert.match(deployWorkflow,/https:\/\/nuvio-anime-releases-addon-rho\.vercel\.app\/catalog\/anime\/current_season\.json/);assert.doesNotMatch(deployWorkflow,/\/catalog\/series\/ongoing\.json/);assert.match(deployWorkflow,/com\.marki\.nuvio\.anime-releases/);assert.doesNotMatch(deployWorkflow,/com\.marki\.nuvio\.anime-releases\.v5/);assert.doesNotMatch(deployWorkflow,/\/v5\//);assert.match(deployWorkflow,/\^\(anilist:\\d\+\|tt\\d\+\|tvdb:\\d\+\|tmdb:\\d\+\)\$/);});
test("version verification workflow listens to the actual release workflow name",()=>{assert.match(verifyWorkflow,/workflows:\s*\[\"CI, automatic patch versioning, and controlled Vercel release\"\]/);});

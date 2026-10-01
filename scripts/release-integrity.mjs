export function parseVersion(value) {
  const match = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid semantic version: ${value}`);
  return match.slice(1).map(Number);
}

export function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function incrementMinor(version) {
  const [major, minor] = parseVersion(version);
  return `${major}.${minor + 1}.0`;
}

export function validateVersionConsistency({
  addonVersion,
  packageVersion,
  productionVersion,
  productionTag,
  nextReleaseVersion,
  deploymentsSincePause,
  deploymentLimit,
  paused,
}) {
  if (addonVersion !== packageVersion) {
    throw new Error(`api/version.js (${addonVersion}) does not match package.json (${packageVersion}).`);
  }
  if (!/^v\d+\.\d+\.\d+$/.test(productionTag) || productionTag !== `v${productionVersion}`) {
    throw new Error(`Production tag ${productionTag} does not match production version ${productionVersion}.`);
  }
  if (incrementMinor(productionVersion) !== nextReleaseVersion) {
    throw new Error(`Next release ${nextReleaseVersion} is not the minor increment of production ${productionVersion}.`);
  }
  if (!Number.isInteger(deploymentsSincePause) || !Number.isInteger(deploymentLimit) ||
      deploymentsSincePause < 0 || deploymentLimit <= 0 || deploymentsSincePause > deploymentLimit) {
    throw new Error("Deployment checkpoint state is invalid.");
  }
  if (typeof paused !== "boolean") throw new Error("Deployment checkpoint paused flag is invalid.");
  if (paused !== (deploymentsSincePause >= deploymentLimit)) {
    throw new Error("Deployment checkpoint paused flag does not match the deployment count.");
  }
  if (compareVersions(addonVersion, productionVersion) < 0) {
    throw new Error(`Development version ${addonVersion} is behind production version ${productionVersion}.`);
  }
  return true;
}

export function validateReleaseTarget({ targetVersion, expectedVersion, targetSha }) {
  if (!/^[0-9a-f]{40}$/i.test(String(targetSha || ""))) throw new Error("Release target SHA must be a full 40-character commit SHA.");
  if (targetVersion !== expectedVersion) throw new Error(`Release target version ${targetVersion} does not match expected release version ${expectedVersion}.`);
  return true;
}

import fs from "node:fs";
import path from "node:path";

function readVersionFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/ADDON_VERSION = "([^"]+)"/);
  if (!match) throw new Error(`Missing ADDON_VERSION in ${filePath}.`);
  return match[1];
}

function readReadmeVersions(readme) {
  const badge = readme.match(/version-(\d+\.\d+\.\d+)-blue/);
  const production = readme.match(/\*\*Production:\*\*\s*`([^`]+)`/);
  const development = readme.match(/\*\*Development:\*\*\s*`([^`]+)`/);
  if (!badge || !production || !development) throw new Error("README release version markers are incomplete.");
  return { badge: badge[1], production: production[1], development: development[1] };
}

export function validateRepositoryReleaseState(root = process.cwd()) {
  const addonVersion = readVersionFile(path.join(root, "api/version.js"));
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const state = JSON.parse(fs.readFileSync(path.join(root, "ops/release-state.json"), "utf8"));
  const readmeVersions = readReadmeVersions(fs.readFileSync(path.join(root, "README.md"), "utf8"));

  validateVersionConsistency({
    addonVersion,
    packageVersion: packageJson.version,
    productionVersion: state.lastDeploymentVersion,
    productionTag: state.lastDeploymentTag,
    nextReleaseVersion: state.nextReleaseVersion,
    deploymentsSincePause: state.deploymentsSincePause,
    deploymentLimit: state.deploymentLimit,
    paused: state.paused,
  });

  if (readmeVersions.badge !== addonVersion || readmeVersions.development.replace(/^v/, "") !== addonVersion) {
    throw new Error("README development version is out of sync with api/version.js.");
  }
  if (readmeVersions.production.replace(/^v/, "") !== state.lastDeploymentVersion) {
    throw new Error("README production version is out of sync with ops/release-state.json.");
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateRepositoryReleaseState();
  console.log("Release metadata validation passed.");
}

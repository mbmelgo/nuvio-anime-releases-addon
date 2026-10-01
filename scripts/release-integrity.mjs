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

import fs from "node:fs";\nimport path from "node:path";\n\nfunction readVersionFile(filePath) {\n  const content = fs.readFileSync(filePath, "utf8");\n  const match = content.match(/ADDON_VERSION = "([^"]+)"/);\n  if (!match) throw new Error(`Missing ADDON_VERSION in ${filePath}.`);\n  return match[1];\n}\n\nfunction readReadmeVersions(readme) {\n  const badge = readme.match(/version-(\d+\.\d+\.\d+)-blue/);\n  const production = readme.match(/\*\*Production:\*\*\s*`([^`]+)`/);\n  const development = readme.match(/\*\*Development:\*\*\s*`([^`]+)`/);\n  if (!badge || !production || !development) throw new Error("README release version markers are incomplete.");\n  return { badge: badge[1], production: production[1], development: development[1] };\n}\n\nexport function validateRepositoryReleaseState(root = process.cwd()) {\n  const addonVersion = readVersionFile(path.join(root, "api/version.js"));\n  const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));\n  const state = JSON.parse(fs.readFileSync(path.join(root, "ops/release-state.json"), "utf8"));\n  const readmeVersions = readReadmeVersions(fs.readFileSync(path.join(root, "README.md"), "utf8"));\n\n  validateVersionConsistency({\n    addonVersion,\n    packageVersion: packageJson.version,\n    productionVersion: state.lastDeploymentVersion,\n    productionTag: state.lastDeploymentTag,\n    nextReleaseVersion: state.nextReleaseVersion,\n    deploymentsSincePause: state.deploymentsSincePause,\n    deploymentLimit: state.deploymentLimit,\n    paused: state.paused,\n  });\n\n  if (readmeVersions.badge !== addonVersion || readmeVersions.development !== addonVersion) {\n    throw new Error("README development version is out of sync with api/version.js.");\n  }\n  if (readmeVersions.production !== state.lastDeploymentVersion) {\n    throw new Error("README production version is out of sync with ops/release-state.json.");\n  }\n  return true;\n}\n\nif (import.meta.url === `file://${process.argv[1]}`) {\n  validateRepositoryReleaseState();\n  console.log("Release metadata validation passed.");\n}

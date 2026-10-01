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

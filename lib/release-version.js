export function minorReleaseVersion(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.\d+$/);
  if (!match) throw new Error(`Invalid semantic version: ${version}`);
  return `${Number(match[1])}.${Number(match[2])}.0`;
}

export function nextMinorDevelopmentVersion(version) {
  const match = String(version).trim().match(/^(\d+)\.(\d+)\.\d+$/);
  if (!match) throw new Error(`Invalid semantic version: ${version}`);
  return `${Number(match[1])}.${Number(match[2]) + 1}.0`;
}

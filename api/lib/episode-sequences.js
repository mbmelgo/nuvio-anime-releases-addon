export function reconcileEpisodeSequences(sequences) {
  const accepted = [];

  for (const sequence of Array.isArray(sequences) ? sequences : []) {
    const rows = dedupeRows(sequence?.rows);
    if (!rows.length) continue;

    const identity = String(sequence?.identity || "");
    const duplicateOf = accepted.find((candidate) => looksLikeSameSequence(candidate.rows, rows));
    if (duplicateOf) {
      duplicateOf.rows = mergeRows(duplicateOf.rows, rows);
      continue;
    }

    accepted.push({ identity, rows: rows.map((row) => ({ ...row, identity })) });
  }

  // Accepted sequences are distinct canonical segments. Duplicate/alternate
  // provider sequences have already been merged above. Remaining segments must
  // continue the same canonical numbering space rather than restarting at 1.
  let offset = 0;
  const result = [];
  for (const sequence of accepted) {
    const rows = canonicalizeRows(sequence.rows, sequence.identity, offset);
    result.push(...rows);
    offset += rows.length;
  }
  return result;
}

export function looksLikeSameSequence(aRows, bRows) {
  const a = dedupeRows(aRows);
  const b = dedupeRows(bRows);
  if (!a.length || !b.length) return false;

  const comparable = Math.min(a.length, b.length);
  if (comparable >= 3) {
    let matches = 0;
    for (let i = 0; i < comparable; i++) {
      if (sameEpisodeIdentity(a[i], b[i])) matches++;
    }
    if (matches / comparable >= 0.6) return true;
  }

  const byNumber = new Map(a.map((row) => [Number(row.number), row]));
  let matches = 0;
  let comparableByNumber = 0;
  for (const row of b) {
    const other = byNumber.get(Number(row.number));
    if (!other) continue;
    comparableByNumber++;
    if (sameEpisodeIdentity(other, row)) matches++;
  }
  return comparableByNumber >= 3 && matches / comparableByNumber >= 0.6;
}

function mergeRows(aRows, bRows) {
  const merged = dedupeRows([...aRows, ...bRows]);
  const byIdentity = new Map();

  for (const row of merged) {
    const key = episodeKey(row);
    const existing = byIdentity.get(key);
    if (!existing || betterRow(row, existing)) byIdentity.set(key, { ...existing, ...row });
  }

  return [...byIdentity.values()].sort(compareRows);
}

function canonicalizeRows(rows, identity, offset = 0) {
  return dedupeRows(rows).map((row, index) => ({
    ...row,
    identity: row.identity || identity,
    canonicalNumber: offset + index + 1,
  }));
}

function episodeKey(row) {
  const title = normalizeTitle(row?.title);
  const date = String(row?.released || "").slice(0, 10);
  const sourceSeason = Number(row?.sourceSeason);
  const seasonKey = Number.isInteger(sourceSeason) && sourceSeason > 0 ? `|season:${sourceSeason}` : "";
  if (title && date) return `title:${title}|date:${date}${seasonKey}`;
  if (title) return `title:${title}${seasonKey}`;
  if (date) return `date:${date}${seasonKey}`;
  return `number:${Number(row?.number)}${seasonKey}`;
}

function compareRows(a, b) {
  const dateA = Date.parse(a?.released || "");
  const dateB = Date.parse(b?.released || "");
  if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) return dateA - dateB;
  const seasonA = Number(a?.sourceSeason || 0);
  const seasonB = Number(b?.sourceSeason || 0);
  if (seasonA !== seasonB) return seasonA - seasonB;
  return Number(a?.number || 0) - Number(b?.number || 0);
}

function sameEpisodeIdentity(a, b) {
  const titleA = normalizeTitle(a?.title);
  const titleB = normalizeTitle(b?.title);
  if (titleA && titleB) return titleA === titleB;

  const dateA = String(a?.released || "").slice(0, 10);
  const dateB = String(b?.released || "").slice(0, 10);
  return Boolean(dateA && dateB && dateA === dateB);
}

function dedupeRows(rows) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const number = Number(row?.number);
    if (!Number.isInteger(number) || number <= 0) continue;
    const sourceSeason = Number(row?.sourceSeason);
    const key = Number.isInteger(sourceSeason) && sourceSeason > 0 ? `${sourceSeason}:${number}` : String(number);
    const old = map.get(key);
    if (!old || betterRow(row, old)) map.set(key, { ...row, number });
  }
  return [...map.values()].sort((a, b) => {
    const seasonA = Number(a?.sourceSeason || 0);
    const seasonB = Number(b?.sourceSeason || 0);
    if (seasonA !== seasonB) return seasonA - seasonB;
    return a.number - b.number;
  });
}

function betterRow(a, b) {
  return (
    (!b.thumbnail && a.thumbnail) ||
    (!b.released && a.released) ||
    (/^Episode \d+$/i.test(b.title || "") && !/^Episode \d+$/i.test(a.title || ""))
  );
}

function normalizeTitle(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

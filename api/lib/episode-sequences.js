export function reconcileEpisodeSequences(sequences) {
  const accepted = [];
  let nextEpisode = 1;

  for (const sequence of Array.isArray(sequences) ? sequences : []) {
    const rows = dedupeRows(sequence?.rows);
    if (!rows.length) continue;

    const duplicateOf = accepted.find((candidate) => looksLikeSameSequence(candidate.rows, rows));
    if (duplicateOf) {
      duplicateOf.rows = mergeRows(duplicateOf.rows, rows);
      continue;
    }

    const planned = rows.map((row) => ({
      ...row,
      canonicalNumber: nextEpisode + Number(row.number) - 1,
    }));
    nextEpisode += rows.length;
    accepted.push({
      identity: sequence?.identity || "",
      rows: planned,
    });
  }

  return accepted.flatMap((sequence) => sequence.rows);
}

export function looksLikeSameSequence(aRows, bRows) {
  const a = dedupeRows(aRows);
  const b = dedupeRows(bRows);
  if (!a.length || !b.length) return false;

  const byNumber = new Map(a.map((row) => [Number(row.number), row]));
  let matches = 0;

  for (const row of b) {
    const other = byNumber.get(Number(row.number));
    if (!other) continue;
    if (sameEpisodeIdentity(other, row)) matches++;
  }

  const comparable = Math.min(a.length, b.length);
  return matches >= 3 && matches / comparable >= 0.6;
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
    const old = map.get(number);
    if (!old || betterRow(row, old)) map.set(number, { ...row, number });
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

function mergeRows(aRows, bRows) {
  const map = new Map(aRows.map((row) => [Number(row.canonicalNumber ?? row.number), { ...row }]));
  for (const row of bRows) {
    const key = Number(row.number);
    const existing = [...map.values()].find((candidate) => Number(candidate.number) === key);
    if (!existing) continue;
    if (betterRow(row, existing)) Object.assign(existing, row);
  }
  return [...map.values()].sort((a, b) => Number(a.canonicalNumber ?? a.number) - Number(b.canonicalNumber ?? b.number));
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

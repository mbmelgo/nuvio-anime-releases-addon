export async function collectValidatedCatalogPage({
  skip = 0,
  pageSize = 10,
  maxPages = 5,
  fetchPage,
  canonicalizePage,
  onPage,
}) {
  const normalizedSkip = Math.max(0, Number(skip) || 0);
  const targetCount = normalizedSkip + pageSize;
  const valid = [];
  const seenIds = new Set();
  let pending = Promise.resolve(fetchPage(1));

  for (let page = 1; page <= maxPages && valid.length < targetCount; page++) {
    const rows = await pending;
    if (!Array.isArray(rows) || rows.length === 0) break;

    // Keep upstream pagination ordered and bounded, but overlap the next
    // AniList request with the current page's identity validation.
    if (page < maxPages && rows.length >= pageSize) {
      pending = fetchPage(page + 1);
    }

    const resolved = await canonicalizePage(rows);
    for (const meta of Array.isArray(resolved) ? resolved : []) {
      if (!meta) continue;
      const identity = String(meta.id || "").trim();
      if (!identity || seenIds.has(identity)) continue;
      seenIds.add(identity);
      valid.push(meta);
    }

    if (typeof onPage === "function") {
      await onPage({
        page,
        rawCount: rows.length,
        validCount: Array.isArray(resolved) ? resolved.length : 0,
        accumulatedCount: valid.length,
      });
    }

    if (rows.length < pageSize) break;
  }

  return valid.slice(normalizedSkip, targetCount);
}

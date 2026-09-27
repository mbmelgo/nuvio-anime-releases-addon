const CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 6000;
const cache = new Map();

export function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.time > CACHE_TTL_MS) { cache.delete(key); return undefined; }
  return hit.value;
}

export function setCached(key, value) { cache.set(key, { time: Date.now(), value }); return value; }

export function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

export async function requestJson(url, options = {}) {
  const { method = "GET", headers, body, timeoutMs = DEFAULT_TIMEOUT_MS, retries = 2, cacheKey } = options;
  if (cacheKey) { const hit = getCached(cacheKey); if (hit !== undefined) return hit; }
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      const text = await response.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { throw new Error(`Invalid JSON (${response.status}) from ${url}`); }
      if (response.ok) { if (cacheKey) setCached(cacheKey, json); return json; }
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === retries) throw new Error(`HTTP ${response.status} from ${url}`);
      const retryAfter = Number(response.headers.get("retry-after"));
      await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * (attempt + 1));
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(350 * (attempt + 1));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error(`Request failed: ${url}`);
}

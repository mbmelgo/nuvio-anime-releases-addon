const ANILIST_GRAPHQL_URL = "https://graphql.anilist.co";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 250;
let installed = false;
let originalFetch = null;

function isAniListRequest(input) {
  const value = typeof input === "string" ? input : input?.url;
  try { return new URL(String(value || "")).origin + new URL(String(value || "")).pathname === ANILIST_GRAPHQL_URL; } catch { return false; }
}

function retryDelayMs(response, attempt, baseDelayMs) {
  const retryAfter = Number(response?.headers?.get?.("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  return baseDelayMs * (2 ** Math.max(0, attempt - 1));
}

function sleep(ms) { return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve(); }

export async function requestJsonWithRetry(url, options = {}, fetchImpl = fetch, config = {}) {
  const maxAttempts = Math.max(1, Number(config.maxAttempts) || DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = Math.max(0, Number(config.baseDelayMs) || DEFAULT_BASE_DELAY_MS);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetchImpl(url, options);
    const json = await response.json().catch(() => ({}));
    if (response.ok) return json;
    if (response.status !== 429 || attempt >= maxAttempts) {
      throw new Error(json?.errors?.map?.((error) => error.message).join("; ") || `HTTP ${response.status}`);
    }
    await sleep(retryDelayMs(response, attempt, baseDelayMs));
  }
  throw new Error("AniList request retry limit exceeded");
}

export function installAniListFetchResilience() {
  if (installed || typeof globalThis.fetch !== "function") return;
  originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, options) => {
    if (!isAniListRequest(input)) return originalFetch(input, options);
    const maxAttempts = DEFAULT_MAX_ATTEMPTS;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await originalFetch(input, options);
      if (response.status !== 429 || attempt >= maxAttempts) return response;
      await sleep(retryDelayMs(response, attempt, DEFAULT_BASE_DELAY_MS));
    }
    return originalFetch(input, options);
  };
  installed = true;
}

installAniListFetchResilience();

import test from "node:test";
import assert from "node:assert/strict";
import { requestJsonWithRetry } from "../api/catalog-source.js";

test("retries AniList 429 responses and succeeds on the next attempt", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ errors: [{ message: "Too Many Requests." }] }), { status: 429, headers: { "Retry-After": "0" } });
    return new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const result = await requestJsonWithRetry("https://example.test", { method: "POST" }, fetchImpl, { maxAttempts: 2, baseDelayMs: 0 });
  assert.deepEqual(result, { data: { ok: true } });
  assert.equal(calls, 2);
});

test("surfaces a non-rate-limit HTTP failure without retrying", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return new Response(JSON.stringify({ errors: [{ message: "Bad Request." }] }), { status: 400 });
  };
  await assert.rejects(() => requestJsonWithRetry("https://example.test", { method: "POST" }, fetchImpl, { maxAttempts: 3, baseDelayMs: 0 }), /HTTP 400/);
  assert.equal(calls, 1);
});

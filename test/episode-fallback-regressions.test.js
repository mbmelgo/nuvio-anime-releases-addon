import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEpisodeFallback } from "../api/meta-resolver-v5.js";

test("normalizes a multi-year TVMaze fallback to the requested anime's absolute sequence", () => {
  const rows = [
    { number: 1, sourceSeason: 2002, released: "2002-10-03T00:00:00Z", title: "Episode 1" },
    { number: 1, sourceSeason: 2003, released: "2003-01-09T00:00:00Z", title: "Episode 14" },
    { number: 5, sourceSeason: 2007, released: "2007-02-08T00:00:00Z", title: "Departure" }
  ];
  const normalized = normalizeEpisodeFallback(rows, { aired: { from: "2002-10-02T00:00:00Z", to: "2007-02-08T00:00:00Z" } });
  assert.deepEqual(normalized.map(row => [row.number, row.sourceSeason, row.absoluteEpisodeNumber]), [[1, 0, 1], [2, 0, 2], [3, 0, 3]]);
});

test("filters unrelated TVMaze episodes outside the requested anime airing window", () => {
  const rows = [
    { number: 1, sourceSeason: 2021, released: "2021-01-01T00:00:00Z", title: "Old" },
    { number: 1, sourceSeason: 2024, released: "2024-04-01T00:00:00Z", title: "Requested 1" },
    { number: 2, sourceSeason: 2024, released: "2024-04-08T00:00:00Z", title: "Requested 2" },
    { number: 1, sourceSeason: 2025, released: "2025-01-01T00:00:00Z", title: "New" }
  ];
  const normalized = normalizeEpisodeFallback(rows, { aired: { from: "2024-03-01T00:00:00Z", to: "2024-05-01T00:00:00Z" } });
  assert.deepEqual(normalized.map(row => row.title), ["Requested 1", "Requested 2"]);
});

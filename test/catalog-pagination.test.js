import assert from "node:assert/strict";
import test from "node:test";
import { collectValidatedCatalogPage } from "../lib/catalog-pagination.js";

test("validated catalog pagination fills a Nuvio page from later AniList pages", async () => {
  const calls = [];
  const pages = [
    [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
    [{ id: "e" }, { id: "f" }, { id: "g" }, { id: "h" }],
    [{ id: "i" }, { id: "j" }, { id: "k" }, { id: "l" }],
  ];
  const result = await collectValidatedCatalogPage({
    skip: 0,
    pageSize: 4,
    maxPages: 3,
    fetchPage: async (page) => {
      calls.push(page);
      return pages[page - 1] || [];
    },
    canonicalizePage: async (rows) => rows.filter((row) => !["b", "f", "j"].includes(row.id)),
  });

  assert.deepEqual(result.map((meta) => meta.id), ["a", "c", "d", "e"]);
  assert.deepEqual(calls, [1, 2]);
});

test("validated catalog pagination applies Nuvio skip after validation", async () => {
  const result = await collectValidatedCatalogPage({
    skip: 4,
    pageSize: 4,
    maxPages: 3,
    fetchPage: async (page) => [["a", "b", "c", "d"], ["e", "f", "g", "h"], ["i", "j", "k", "l"]][page - 1]?.map((id) => ({ id })) || [],
    canonicalizePage: async (rows) => rows.filter((row) => !["b", "f", "j"].includes(row.id)),
  });

  assert.deepEqual(result.map((meta) => meta.id), ["g", "h", "i", "k"]);
});

test("validated catalog pagination stops at the configured page bound", async () => {
  const calls = [];
  const result = await collectValidatedCatalogPage({
    skip: 0,
    pageSize: 10,
    maxPages: 2,
    fetchPage: async (page) => {
      calls.push(page);
      return Array.from({ length: 10 }, (_, index) => ({ id: `${page}-${index}` }));
    },
    canonicalizePage: async () => [],
  });

  assert.deepEqual(result, []);
  assert.deepEqual(calls, [1, 2]);
});

test("validated catalog pagination deduplicates canonical identities before applying the Nuvio page boundary", async () => {
  const calls = [];
  const pages = [
    [{ id: "tvdb:100", name: "Season 1" }, { id: "tvdb:100", name: "Season 1 duplicate" }, { id: "tvdb:200", name: "Season 2" }, { id: "tvdb:250", name: "Season 2 alternate" }],
    [{ id: "tvdb:300", name: "Season 3" }, { id: "tvdb:200", name: "Season 2 duplicate" }, { id: "tvdb:400", name: "Season 4" }, { id: "tvdb:450", name: "Season 4 alternate" }],
  ];
  const result = await collectValidatedCatalogPage({
    skip: 0,
    pageSize: 4,
    maxPages: 2,
    fetchPage: async (page) => {
      calls.push(page);
      return pages[page - 1] || [];
    },
    canonicalizePage: async (rows) => rows,
  });

  assert.deepEqual(result.map((meta) => meta.id), ["tvdb:100", "tvdb:200", "tvdb:250", "tvdb:300"]);
  assert.deepEqual(calls, [1, 2]);
});

test("validated catalog pagination prefetches the next AniList page while validating the current page", async () => {
  const calls = [];
  let releaseValidation;
  const validationGate = new Promise((resolve) => { releaseValidation = resolve; });

  const resultPromise = collectValidatedCatalogPage({
    skip: 0,
    pageSize: 2,
    maxPages: 2,
    fetchPage: async (page) => {
      calls.push(page);
      return [{ id: `${page}-a` }, { id: `${page}-b` }];
    },
    canonicalizePage: async (rows) => {
      assert.deepEqual(calls, [1, 2]);
      releaseValidation();
      await validationGate;
      return rows;
    },
  });

  const result = await resultPromise;
  assert.deepEqual(result.map((meta) => meta.id), ["1-a", "1-b"]);
});

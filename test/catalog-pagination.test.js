import assert from "node:assert/strict";
import test from "node:test";
import { collectValidatedCatalogPage } from "../lib/catalog-pagination.js";

test("validated catalog pagination fills a Nuvio page from later AniList pages", async () => {
  const calls = [];
  const pages = [
    ["a", "b", "c", "d"],
    ["e", "f", "g", "h"],
    ["i", "j", "k", "l"],
  ];
  const result = await collectValidatedCatalogPage({
    skip: 0,
    pageSize: 4,
    maxPages: 3,
    fetchPage: async (page) => {
      calls.push(page);
      return pages[page - 1] || [];
    },
    canonicalizePage: async (rows) => rows.filter((row) => !["b", "f", "j"].includes(row)),
  });

  assert.deepEqual(result, ["a", "c", "d", "e"]);
  assert.deepEqual(calls, [1, 2]);
});

test("validated catalog pagination applies Nuvio skip after validation", async () => {
  const result = await collectValidatedCatalogPage({
    skip: 4,
    pageSize: 4,
    maxPages: 3,
    fetchPage: async (page) => [["a", "b", "c", "d"], ["e", "f", "g", "h"], ["i", "j", "k", "l"]][page - 1] || [],
    canonicalizePage: async (rows) => rows.filter((row) => !["b", "f", "j"].includes(row)),
  });

  assert.deepEqual(result, ["g", "h", "i", "k"]);
});

test("validated catalog pagination stops at the configured page bound", async () => {
  const calls = [];
  const result = await collectValidatedCatalogPage({
    skip: 0,
    pageSize: 10,
    maxPages: 2,
    fetchPage: async (page) => {
      calls.push(page);
      return Array.from({ length: 10 }, (_, index) => `${page}-${index}`);
    },
    canonicalizePage: async () => [],
  });

  assert.deepEqual(result, []);
  assert.deepEqual(calls, [1, 2]);
});

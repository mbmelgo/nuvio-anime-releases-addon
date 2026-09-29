import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogPage } from "../api/catalog-source.js";

test("catalog canonicalization falls back to full root recovery only for unresolved candidates", async () => {
  const metas = [
    { id: "anilist:185874", name: "BLEACH: Thousand-Year Blood War - The Calamity" },
    { id: "anilist:204650", name: "Tougen Anki: Nikko Kegon Falls Arc" },
    { id: "anilist:199068", name: "The Prince of Tennis II U-17 WORLD CUP: Final Member Selection Match" },
  ];

  const fastCalls = [];
  const fullCalls = [];
  const result = await canonicalizeCatalogPage(metas, {
    fastCanonicalize: async (items) => {
      fastCalls.push(items.map((item) => item.id));
      return [
        { ...items[0], id: "tvdb:74796", extra: { originalCatalogId: items[0].id } },
      ];
    },
    fullCanonicalize: async (items) => {
      fullCalls.push(items.map((item) => item.id));
      return items.map((item, index) => ({
        ...item,
        id: index === 0 ? "tvdb:443384" : "tmdb:205493",
        extra: { originalCatalogId: item.id },
      }));
    },
  });

  assert.deepEqual(fastCalls, [["anilist:185874", "anilist:204650", "anilist:199068"]]);
  assert.deepEqual(fullCalls, [["anilist:204650", "anilist:199068"]]);
  assert.deepEqual(result.map((meta) => meta.id), ["tvdb:74796", "tvdb:443384", "tmdb:205493"]);
});

test("catalog canonicalization does not expose unsupported identities recovered by the full resolver", async () => {
  const metas = [{ id: "anilist:999", name: "Unresolved Anime" }];

  const result = await canonicalizeCatalogPage(metas, {
    fastCanonicalize: async () => [],
    fullCanonicalize: async () => [{ ...metas[0], id: "anilist:999", extra: { originalCatalogId: metas[0].id } }],
  });

  assert.deepEqual(result, []);
});

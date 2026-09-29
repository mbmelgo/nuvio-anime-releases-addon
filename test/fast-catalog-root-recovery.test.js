import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";

test("fast catalog identity recovers root TVDB identities for known seasonal continuations", async () => {
  const metas = [
    {
      id: "anilist:185874",
      type: "series",
      name: "BLEACH: Thousand-Year Blood War - The Calamity",
      releaseInfo: "2026",
      extra: { anilistId: 185874 },
    },
    {
      id: "anilist:204650",
      type: "series",
      name: "Tougen Anki: Nikko Kegon Falls Arc",
      releaseInfo: "2026",
      extra: { anilistId: 204650 },
    },
    {
      id: "anilist:199068",
      type: "series",
      name: "The Prince of Tennis II U-17 WORLD CUP: Final Member Selection Match",
      releaseInfo: "2026",
      extra: { anilistId: 199068 },
    },
  ];
  const roots = new Map([
    [185874, { tvdbId: "74796", anilistId: "116674" }],
    [204650, { tvdbId: "443384", anilistId: "177474" }],
    [199068, { tvdbId: "205493", anilistId: "11371" }],
  ]);

  const result = await canonicalizeCatalogMetasFast(metas, {
    resolveTvdb: async () => null,
    resolveMalTvdb: async () => null,
    recoverRoot: async (meta) => roots.get(meta.extra.anilistId),
    resolveExternalIdentity: async () => null,
  });

  assert.deepEqual(result.map((meta) => meta.id), ["tvdb:74796", "tvdb:443384", "tvdb:205493"]);
  assert.deepEqual(result.map((meta) => meta.extra.tvdbSourceAnilistId), ["116674", "177474", "11371"]);
});

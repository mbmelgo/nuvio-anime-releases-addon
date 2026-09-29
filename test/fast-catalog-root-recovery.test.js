import assert from "node:assert/strict";
import test from "node:test";
import { canonicalizeCatalogMetasFast } from "../lib/kitsu-canonical.js";

test("fast catalog identity recovers a validated root TVDB identity for a seasonal continuation", async () => {
  const metas = [{
    id: "mal:62000",
    type: "series",
    name: "Example Anime: Final Arc",
    releaseInfo: "2026",
    extra: { anilistId: 199999, malId: 62000 },
  }];

  const result = await canonicalizeCatalogMetasFast(metas, {
    resolveTvdb: async () => null,
    resolveMalTvdb: async () => null,
    recoverContinuation: async () => ({ status: "not_found", tvdbId: null }),
    recoverRoot: async () => ({ tvdbId: "123456", anilistId: "100000" }),
    resolveExternalIdentity: async () => null,
  });

  assert.equal(result[0].id, "tvdb:123456");
  assert.equal(result[0].extra.tvdbId, "123456");
  assert.equal(result[0].extra.tvdbSourceAnilistId, "100000");
});

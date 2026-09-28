import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { buildManifest, normalizeResolver } from "../api/resolver-manifest.js";

const seasonInfo = {
  ongoing: { season: "SUMMER", year: 2026 },
  previous: { season: "SPRING", year: 2026 },
  upcoming: { season: "FALL", year: 2026 },
};

test("resolver manifests select only v4 or v5 and default invalid values to v4", () => {
  assert.equal(normalizeResolver("v4"), "v4");
  assert.equal(normalizeResolver("V5"), "v5");
  assert.equal(normalizeResolver("unknown"), "v4");
  assert.equal(normalizeResolver(""), "v4");
});

test("resolver manifests use separate addon IDs while sharing the catalog contract", () => {
  const v4 = buildManifest(seasonInfo, "v4");
  const v5 = buildManifest(seasonInfo, "v5");

  assert.equal(v4.id, "com.marki.nuvio.anime-releases.v4");
  assert.equal(v5.id, "com.marki.nuvio.anime-releases.v5");
  assert.deepEqual(v4.resources, v5.resources);
  assert.deepEqual(v4.catalogs, v5.catalogs);
  assert.match(v4.name, /\(v4\)$/);
  assert.match(v5.name, /\(v5\)$/);
});

test("Vercel routes resolver-specific manifests and metadata to the matching resolver", () => {
  const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const rewrites = vercel.rewrites;

  const route = (source) => rewrites.find((entry) => entry.source === source)?.destination;

  assert.equal(route("/v4/manifest.json"), "/api/resolver-manifest?resolver=v4");
  assert.equal(route("/v5/manifest.json"), "/api/resolver-manifest?resolver=v5");
  assert.equal(route("/v4/meta/:type/:id.json"), "/api/meta-resolver-v4?type=:type&id=:id");
  assert.equal(route("/v5/meta/:type/:id.json"), "/api/meta-resolver-v5?type=:type&id=:id");
  assert.equal(route("/v4/catalog/:type/:id.json"), "/api/stremio?resource=catalog&type=:type&id=:id");
  assert.equal(route("/v5/catalog/:type/:id.json"), "/api/stremio?resource=catalog&type=:type&id=:id");
});

test("resolver selector home page exposes both resolver choices and installs the selected manifest", () => {
  const home = fs.readFileSync(new URL("../api/home-selector.js", import.meta.url), "utf8");

  assert.match(home, /data-resolver="v4"/);
  assert.match(home, /data-resolver="v5"/);
  assert.match(home, /\/v4\/manifest\.json/);
  assert.match(home, /\/v5\/manifest\.json/);
  assert.match(home, /selectResolver\(resolver\)/);
});

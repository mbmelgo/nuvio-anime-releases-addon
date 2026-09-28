import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("v5 metadata routes use the rich metadata resolver", () => {
  const config = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  const routes = Object.fromEntries(config.rewrites.map(route => [route.source, route.destination]));

  assert.equal(routes["/v5/meta/:type/:id.json"], "/api/meta-resolver-v5-rich?type=:type&id=:id");
  assert.equal(routes["/v5/api/meta/series/:id.json"], "/api/meta-resolver-v5-rich?type=series&id=:id");
  assert.equal(routes["/meta/:type/:id.json"], "/api/meta-resolver-v5-rich?type=:type&id=:id");
  assert.equal(routes["/api/meta/series/:id.json"], "/api/meta-resolver-v5-rich?type=series&id=:id");
  assert.equal(routes["/v4/meta/:type/:id.json"], "/api/meta-resolver-v4?type=:type&id=:id");
});

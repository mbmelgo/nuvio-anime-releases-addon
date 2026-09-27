import test from "node:test";
import assert from "node:assert/strict";
import { reconcileEpisodeSources } from "../api/lib/episodes.js";

test("Attack on Titan regression: identical Jikan/AniZip episode sequences are reconciled, not appended", () => {
  const jikan = [
    { number: 13, title: "Town Where Everything Began" },
    { number: 14, title: "Thunder Spears" },
    { number: 15, title: "Descent" }
  ];
  const aniZip = [
    { number: 13, title: "Town Where Everything Began", thumbnail: "13.jpg" },
    { number: 14, title: "Thunder Spears", thumbnail: "14.jpg" },
    { number: 15, title: "Descent", thumbnail: "15.jpg" }
  ];
  const rows = reconcileEpisodeSources(jikan, aniZip);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.number), [13, 14, 15]);
});

test("Attack on Titan regression: different provider numbering does not create a shifted duplicate sequence", () => {
  const jikan = [
    { number: 13, title: "Town Where Everything Began" },
    { number: 14, title: "Thunder Spears" },
    { number: 15, title: "Descent" }
  ];
  const aniZip = [
    { number: 1, title: "Town Where Everything Began", thumbnail: "13.jpg" },
    { number: 2, title: "Thunder Spears", thumbnail: "14.jpg" },
    { number: 3, title: "Descent", thumbnail: "15.jpg" }
  ];
  const rows = reconcileEpisodeSources(jikan, aniZip);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(row => row.title), jikan.map(row => row.title));
});

test("One Piece regression: special side-story data cannot displace normal TV episodes", () => {
  const jikan = [
    { number: 1000, title: "Straw Hat Luffy! The Man Who Will Become the Pirate King!" },
    { number: 1001, title: "The Legend of the Red-haired Pirates" }
  ];
  const aniZip = [
    { number: 1000, title: "Episode of Nami" },
    { number: 1001, title: "Fan Letter" }
  ];
  const rows = reconcileEpisodeSources(jikan, aniZip);
  assert.deepEqual(rows.map(row => row.title), jikan.map(row => row.title));
});

test("Mushoku Tensei regression: source enrichment preserves canonical episode numbering", () => {
  const jikan = [
    { number: 1, title: "Jobless Reincarnation" },
    { number: 2, title: "Master" }
  ];
  const aniZip = [
    { number: 1, title: "Jobless Reincarnation", thumbnail: "1.jpg" },
    { number: 2, title: "Master", thumbnail: "2.jpg" }
  ];
  const rows = reconcileEpisodeSources(jikan, aniZip);
  assert.deepEqual(rows.map(row => row.number), [1, 2]);
  assert.deepEqual(rows.map(row => row.thumbnail), ["1.jpg", "2.jpg"]);
});

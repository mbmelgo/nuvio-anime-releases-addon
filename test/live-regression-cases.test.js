import test from "node:test";
import assert from "node:assert/strict";
import { extractAniZipEpisodeBatch } from "../lib/providers.js";
import { isSpecial } from "../lib/episodes.js";
import { chooseRows } from "../api/meta-resolver-v5.js";

test("AniZip long-running payload is not truncated to the first 100 episodes",()=>{const episodes=Array.from({length:1200},(_,i)=>({episodeNumber:i+1}));const result=extractAniZipEpisodeBatch({episodes:Object.fromEntries(episodes.map(episode=>[episode.episodeNumber,episode]))});assert.equal(result.length,1200);assert.equal(result.at(-1).episodeNumber,1200);});
test("Attack on Titan normal TV episode containing Special in its title is retained",()=>{assert.equal(isSpecial({episodeNumber:15},"Special Operations Squad: Eve of the Counterattack"),false);});
test("A mostly complete Jikan sequence can be completed from AniZip without replacing its numbering",()=>{const jikan=Array.from({length:24},(_,i)=>({number:i<14?i+1:i+2,title:`Jikan ${i+1}`})),aniZip=Array.from({length:25},(_,i)=>({number:i+1,title:`AniZip ${i+1}`})),result=chooseRows(jikan,aniZip,25);assert.equal(result.length,25);assert.equal(result.find(row=>row.number===15)?.title,"AniZip 15");});

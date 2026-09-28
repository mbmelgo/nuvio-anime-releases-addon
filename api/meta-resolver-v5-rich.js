import { resolveBase } from "./meta-resolver-v5.js";
import { getRichAniListByMal } from "../lib/rich-anilist.js";
import { enrichMeta } from "../lib/rich-meta.js";

export default async function handler(req, res) {
  const requestedId=queryValue(req,"id"), malId=parseMalId(requestedId), base=await resolveBase(requestedId,queryValue(req,"type")||"series");
  if(base.statusCode>=400)return res.status(base.statusCode).json({meta:null});
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=3600");
  if(!malId)return res.status(base.statusCode).json({meta:base.meta});
  try {
    const richGraph=await Promise.all((base.graph||[]).map(async entry=>{const id=Number(entry?.jikan?.mal_id||0),node=id?await getRichAniListByMal(id):null;return node?{...entry,node}:entry;}));
    const seasonGroups=buildSeasonGroups(richGraph,malId),rootEntry=seasonGroups.find(group=>group.season===1)?.entries?.[0],rootAniList=rootEntry?.node||null,meta=enrichMeta(base.meta,base.root,rootAniList,seasonGroups);
    return res.status(base.statusCode).json({meta});
  } catch(error){console.error("[meta-resolver-v5-rich]",error);return res.status(base.statusCode).json({meta:base.meta});}
}
function queryValue(req,key){try{const value=req.query?.[key];if(Array.isArray(value))return String(value[0]||"");if(value!=null)return String(value);}catch{}try{return new URL(req.url,"http://localhost").searchParams.get(key)||"";}catch{return"";}}
function parseMalId(id){const match=String(id||"").match(/^mal:(\d+)$/i)||String(id||"").match(/^(\d+)$/);return match?Number(match[1]):0;}
export function buildSeasonGroups(entries,requestedMalId){const sorted=[...(entries||[])].sort((a,b)=>startTime(a)-startTime(b)),groups=[],seasonByKey=new Map();for(const entry of sorted){const malId=Number(entry?.jikan?.mal_id||0);if(!malId)continue;const explicit=explicitSeason(entry),key=franchiseKey(entry);let season=explicit||seasonByKey.get(key)||null;if(!season){season=groups.length?Math.max(...groups.map(group=>group.season))+1:1;if(isPart(entry)&&groups.length)season=groups[groups.length-1].season;}if(!groups.some(group=>group.season===season))groups.push({season,entries:[entry]});else{const group=groups.find(group=>group.season===season);if(!group.entries.some(existing=>Number(existing?.jikan?.mal_id||0)===malId))group.entries.push(entry);}if(key&&!seasonByKey.has(key))seasonByKey.set(key,season);}return groups.sort((a,b)=>a.season-b.season);}
function explicitSeason(entry){const titles=[...(Array.isArray(entry?.node?.synonyms)?entry.node.synonyms:[]),entry?.node?.title?.english,entry?.node?.title?.romaji,entry?.node?.title?.native,...(Array.isArray(entry?.jikan?.title_synonyms)?entry.jikan.title_synonyms:[]),entry?.jikan?.title_english,entry?.jikan?.title,entry?.jikan?.title_japanese].filter(Boolean).map(String);for(const title of titles){const numeric=title.match(/\bseason\s*(\d+)\b/i)||title.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i)||title.match(/\bS(\d+)\b/i);if(numeric)return Number(numeric[1]);const roman=title.match(/\b(II|III|IV|V|VI|VII|VIII|IX|X)\b/i);if(roman){const values={II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};return values[roman[1].toUpperCase()]||null;}}return null;}
function franchiseKey(entry){const values=[entry?.node?.title?.english,entry?.node?.title?.romaji,entry?.jikan?.title_english,entry?.jikan?.title].filter(Boolean).map(String);for(const value of values){const key=value.toLowerCase().replace(/\b(?:season|s)\s*\d+\b/gi," ").replace(/\b(?:part|cour)\s*[12]\b/gi," ").replace(/\b(?:ii|iii|iv|v|vi|vii|viii|ix|x)\b/gi," ").replace(/[：:：\-–—,]+/g," ").replace(/\s+/g," ").trim();if(key)return key;}return null;}
function isPart(entry){const values=[entry?.node?.title?.english,entry?.node?.title?.romaji,entry?.jikan?.title_english,entry?.jikan?.title].filter(Boolean).map(String).join(" ");return/\b(?:part|cour)\s*[12]\b/i.test(values)||/第\s*[12]\s*クール/.test(values);}
function startTime(entry){const date=entry?.node?.startDate;return date?.year?Date.UTC(date.year,(date.month||1)-1,date.day||1):Number.MAX_SAFE_INTEGER;}

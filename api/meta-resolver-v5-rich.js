import { resolveBase } from "./meta-resolver-v5.js";
import { getRichAniListByMal } from "../lib/rich-anilist.js";
import { enrichMeta } from "../lib/rich-meta.js";

export default async function handler(req, res) {
  setHeaders(res);
  if(req.method==="OPTIONS")return res.status(200).json({});
  const requestedId=queryValue(req,"id"), malId=parseMalId(requestedId), base=await resolveBase(requestedId,queryValue(req,"type")||"series");
  if(base.statusCode>=400)return res.status(base.statusCode).json({meta:null});
  if(!malId)return res.status(base.statusCode).json({meta:base.meta});
  try {
    const richGraph=await Promise.all((base.graph||[]).map(async entry=>{const id=Number(entry?.jikan?.mal_id||0),node=id?await getRichAniListByMal(id):null;return node?{...entry,node}:entry;})),richById=new Map(richGraph.map(entry=>[Number(entry?.jikan?.mal_id||0),entry]));
    const seasonGroups=(base.seasons||[]).map(group=>({season:group.season,entries:(group.entries||[]).map(entry=>richById.get(Number(entry?.jikan?.mal_id||0))||entry)})),rootEntry=seasonGroups.find(group=>group.season===1)?.entries?.[0],rootAniList=rootEntry?.node||null,meta=enrichMeta(base.meta,base.root,rootAniList,seasonGroups);
    return res.status(base.statusCode).json({meta});
  } catch(error){console.error("[meta-resolver-v5-rich]",error);return res.status(base.statusCode).json({meta:base.meta});}
}
function setHeaders(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=3600");}
function queryValue(req,key){try{const value=req.query?.[key];if(Array.isArray(value))return String(value[0]||"");if(value!=null)return String(value);}catch{}try{return new URL(req.url,"http://localhost").searchParams.get(key)||"";}catch{return"";}}
function parseMalId(id){const match=String(id||"").match(/^mal:(\d+)$/i)||String(id||"").match(/^(\d+)$/);return match?Number(match[1]):0;}

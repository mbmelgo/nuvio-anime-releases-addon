import { resolveBase } from "./meta-resolver-v5.js";
import { getRichAniListByMal } from "../lib/rich-anilist.js";
import { enrichMeta } from "../lib/rich-meta.js";
import { getAniListUpcomingByMal, mergeUpcomingVideos } from "../lib/upcoming.js";

export default async function handler(req, res) {
  setHeaders(res);
  if(req.method==="OPTIONS")return res.status(200).json({});
  const requestedId=queryValue(req,"id"), malId=parseMalId(requestedId), base=await resolveBase(requestedId,queryValue(req,"type")||"series");
  if(base.statusCode>=400)return res.status(base.statusCode).json({meta:null});
  if(!malId)return res.status(base.statusCode).json({meta:base.meta});
  try {
    const richGraph=await Promise.all((base.graph||[]).map(async entry=>{const id=Number(entry?.jikan?.mal_id||0),node=id?await getRichAniListByMal(id):null;return node?{...entry,node}:entry;})),richById=new Map(richGraph.map(entry=>[Number(entry?.jikan?.mal_id||0),entry]));
    const seasonGroups=(base.seasons||[]).map(group=>({season:group.season,entries:(group.entries||[]).map(entry=>richById.get(Number(entry?.jikan?.mal_id||0))||entry)})),rootEntry=seasonGroups.find(group=>group.season===1)?.entries?.[0],rootAniList=rootEntry?.node||null,meta=enrichMeta(base.meta,base.root,rootAniList,seasonGroups);
    const upcomingTasks=[];
    for(const group of seasonGroups){
      for(const entry of group.entries||[]){
        const jikan=entry?.jikan,node=entry?.node;
        const status=String(jikan?.status||node?.status||"").toLowerCase();
        if(!/currently airing|releasing/.test(status))continue;
        const id=Number(jikan?.mal_id||0);
        if(id)upcomingTasks.push(getAniListUpcomingByMal(id,10).then(rows=>({group,entry,rows})).catch(()=>({group,entry,rows:[]})));
      }
    }
    const upcoming=await Promise.all(upcomingTasks);
    let videos=Array.isArray(meta?.videos)?meta.videos:[];
    for(const item of upcoming){
      const identity=`mal:${Number(item.entry?.jikan?.mal_id||0)}`;
      videos=mergeUpcomingVideos(videos,item.rows,item.group.season,identity);
    }
    if(videos.length)meta.videos=videos;
    return res.status(base.statusCode).json({meta});
  } catch(error){console.error("[meta-resolver-v5-rich]",error);return res.status(base.statusCode).json({meta:base.meta});}
}
function setHeaders(res){res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");res.setHeader("Access-Control-Allow-Headers","Content-Type");res.setHeader("Cache-Control","public, s-maxage=900, stale-while-revalidate=3600");}
function queryValue(req,key){try{const value=req.query?.[key];if(Array.isArray(value))return String(value[0]||"");if(value!=null)return String(value);}catch{}try{return new URL(req.url,"http://localhost").searchParams.get(key)||"";}catch{return"";}}
function parseMalId(id){const match=String(id||"").match(/^mal:(\d+)$/i)||String(id||"").match(/^(\d+)$/);return match?Number(match[1]):0;}

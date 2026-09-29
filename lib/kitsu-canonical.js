import {cache,verifiedKitsuCache,tvdbCache,rootTvdbCache,anibridgeTvdbCache,wikidataTvdbCache,wikidataTitleTvdbCache,tvdbWebSearchCache,tvdbSeriesPageCache} from "./canonical-state.js";
import {getMetaTitles} from "./canonical-utils.js";
import {canonicalizeCatalogMetas as resolveCatalogMetas} from "./canonical-identity.js";
import {validateTvdbCandidate} from "./canonical-validation.js";
export async function canonicalizeCatalogMetas(metas,options={}){
  const resolved=await resolveCatalogMetas(metas,options);
  if(!Array.isArray(resolved)||!resolved.length)return resolved;
  const fetchImpl=options.fetchImpl||fetch,now=options.now||Date.now();
  return Promise.all(resolved.map(async(meta,index)=>{
    if(!meta?.id||!String(meta.id).startsWith("tvdb:"))return meta;
    const original=metas[index];
    const tvdbId=String(meta.id).slice(5);
    const year=extractReleaseYear(original);
    const validation=await validateTvdbCandidate(getMetaTitles(original),tvdbId,year,fetchImpl,now);
    if(validation.status==="unknown"||validation.status==="validated")return meta;
    if(validation.status==="replaced"&&validation.tvdbId){
      return {...meta,id:`tvdb:${validation.tvdbId}`,extra:{...(meta.extra||{}),tvdbId:String(validation.tvdbId)}};
    }
    const extra={...(meta.extra||{})};
    delete extra.tvdbId;
    delete extra.tvdbSourceAnilistId;
    return {...meta,id:original?.id||meta.id,extra};
  }));
}
function extractReleaseYear(meta){
  const released=String(meta?.released||"").match(/^(\d{4})/);
  if(released)return Number(released[1]);
  const releaseInfo=String(meta?.releaseInfo||"").match(/^(\d{4})/);
  return releaseInfo?Number(releaseInfo[1]):null;
}
export {canonicalizeId,normalizeTitle,titleMatches} from "./canonical-utils.js";
export {resolveWithTvdbSeriesPageByTitle,resolveWithTvdbWebSearchByTitle} from "./canonical-providers.js";
export function clearCanonicalizationCache(){cache.clear();verifiedKitsuCache.clear();tvdbCache.clear();rootTvdbCache.clear();anibridgeTvdbCache.clear();wikidataTvdbCache.clear();wikidataTitleTvdbCache.clear();tvdbWebSearchCache.clear();tvdbSeriesPageCache.clear()}

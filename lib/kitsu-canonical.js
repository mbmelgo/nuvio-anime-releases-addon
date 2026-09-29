import "./anilist-rate-limit.js";
import {cache,verifiedKitsuCache,tvdbCache,rootTvdbCache,anibridgeTvdbCache,wikidataTvdbCache,wikidataTitleTvdbCache,tvdbWebSearchCache,tvdbSeriesPageCache} from "./canonical-state.js";
import {getMetaTitles} from "./canonical-utils.js";
import {canonicalizeCatalogMetas as resolveCatalogMetas} from "./canonical-identity.js";
import {validateTvdbCandidate,findValidatedTvdbCandidate} from "./canonical-validation.js";
import {recoverContinuingTvdbSeries} from "./canonical-season-recovery.js";
import {resolveExternalMetadataIds} from "./canonical-providers.js";
import {resolveExternalMetadataIdsByAniListId,resolveExternalMetadataIdsByTitle} from "./external-title-ids.js";

export async function canonicalizeCatalogMetas(metas,options={}){
  const resolved=await resolveCatalogMetas(metas,options);
  if(!Array.isArray(resolved)||!resolved.length)return resolved;
  const fetchImpl=options.fetchImpl||fetch;
  return Promise.all(resolved.map(async(meta,index)=>{
    const original=metas[index];
    const titles=getMetaTitles(original);
    const year=extractReleaseYear(original);
    if(meta?.id&&String(meta.id).startsWith("tvdb:")){
      const tvdbId=String(meta.id).slice(5);
      const validation=await validateTvdbCandidate(titles,tvdbId,year,fetchImpl);
      if(validation.status==="unknown"||validation.status==="validated")return meta;
      if(validation.status==="replaced"&&validation.tvdbId)return {...meta,id:`tvdb:${validation.tvdbId}`,extra:{...(meta.extra||{}),tvdbId:String(validation.tvdbId)}};
      const extra={...(meta.extra||{})};
      delete extra.tvdbId;
      delete extra.tvdbSourceAnilistId;
      const external=await resolveExternalIdentity(original,titles,fetchImpl);
      if(external)return {...meta,id:external.id,extra:{...(meta.extra||{}),...external.extra}};
      return {...meta,id:original?.id||meta.id,extra};
    }
    if((String(meta?.id||"").startsWith("mal:")||String(meta?.id||"").startsWith("anilist:"))&&year){
      const recovery=await findValidatedTvdbCandidate(titles,year,fetchImpl);
      if(recovery.status==="found"&&recovery.tvdbId)return {...meta,id:`tvdb:${recovery.tvdbId}`,extra:{...(meta.extra||{}),tvdbId:String(recovery.tvdbId)}};
      const continuationRecovery=await recoverContinuingTvdbSeries(titles,fetchImpl);
      if(continuationRecovery.status==="found"&&continuationRecovery.tvdbId)return {...meta,id:`tvdb:${continuationRecovery.tvdbId}`,extra:{...(meta.extra||{}),tvdbId:String(continuationRecovery.tvdbId)}};
      const external=await resolveExternalIdentity(original,titles,fetchImpl);
      if(external)return {...meta,id:external.id,extra:{...(meta.extra||{}),...external.extra}};
    }
    return meta;
  }));
}

export async function canonicalizeCatalogMetasFast(metas,options={}){
  if(!Array.isArray(metas)||metas.length===0)return Array.isArray(metas)?metas:[];
  const fetchImpl=options.fetchImpl||fetch;
  const resolveTvdb=options.resolveTvdb||defaultFastTvdbResolver;
  const resolved=await Promise.all(metas.map(async(meta)=>{
    if(!meta?.id)return null;
    const originalId=String(meta.id);
    if(!originalId.startsWith("mal:")&&!originalId.startsWith("anilist:"))return meta;

    let tvdbId=null;
    try{tvdbId=await resolveTvdb(meta,fetchImpl,options.now||Date.now())}catch{}
    if(tvdbId)return{...meta,id:`tvdb:${tvdbId}`,extra:{...(meta.extra||{}),tvdbId:String(tvdbId),originalCatalogId:originalId}};

    // Never replace a usable MAL identity with an AniList identity. Nuvio
    // routes the catalog item's ID to installed metadata addons, and an
    // `anilist:` ID is not guaranteed to be handled by the user's addons.
    if(originalId.startsWith("mal:")){
      return{...meta,id:originalId,extra:{...(meta.extra||{}),originalCatalogId:originalId}};
    }

    // AniList is a source identity, not a safe terminal Nuvio identity.
    // Resolve it to a downstream identity only when Wikidata has a unique,
    // title-matching TMDB/IMDb mapping. If none exists, omit the item rather
    // than returning an ID that the installed metadata addons cannot resolve.
    const anilistId=meta?.extra?.anilistId?String(meta.extra.anilistId):null;
    const malId=meta?.extra?.malId?String(meta.extra.malId):null;
    if(malId)return{...meta,id:`mal:${malId}`,extra:{...(meta.extra||{}),originalCatalogId:originalId}};
    if(anilistId){
      try{
        const external=await resolveExternalMetadataIdsByAniListId(anilistId,getMetaTitles(meta),fetchImpl);
        if(external.tmdb)return{...meta,id:`tmdb:${external.tmdb}`,extra:{...(meta.extra||{}),tmdbId:String(external.tmdb),originalCatalogId:originalId}};
        if(external.imdb)return{...meta,id:`imdb:${external.imdb}`,extra:{...(meta.extra||{}),imdbId:String(external.imdb),originalCatalogId:originalId}};
      }catch{}
    }
    return null;
  }));
  return resolved.filter(Boolean);
}

async function defaultFastTvdbResolver(meta,fetchImpl,now){
  const anilistId=meta?.extra?.anilistId?String(meta.extra.anilistId):null;
  const malId=meta?.extra?.malId?String(meta.extra.malId):null;
  const sourceId=anilistId||malId;
  const source=anilistId?"anilist":"mal";
  if(!sourceId)return null;
  const {resolveWithAniBridgeTvdb}=await import("./canonical-providers.js");
  const candidate=await resolveWithAniBridgeTvdb(source,sourceId,fetchImpl,now);
  if(!candidate)return null;
  const validation=await validateTvdbCandidate(getMetaTitles(meta),String(candidate),extractReleaseYear(meta),fetchImpl);
  return validation.status==="rejected"?null:String(validation.tvdbId||candidate);
}

async function resolveExternalIdentity(meta,titles,fetchImpl){const extra=meta?.extra||{},anilistId=extra.anilistId?String(extra.anilistId):null,malId=extra.malId?String(extra.malId):null,kitsuId=extra.kitsuId?String(extra.kitsuId):null,source=anilistId?"anilist":malId?"mal":null,id=anilistId||malId;if(!source||!id)return null;if(anilistId){const direct=await resolveExternalMetadataIdsByAniListId(anilistId,titles,fetchImpl);if(direct.tmdb)return{id:`tmdb:${direct.tmdb}`,extra:{tmdbId:String(direct.tmdb)}};if(direct.imdb)return{id:`imdb:${direct.imdb}`,extra:{imdbId:String(direct.imdb)}}}const external=await resolveExternalMetadataIds(source,id,fetchImpl,kitsuId);if(external.tmdb)return{id:`tmdb:${external.tmdb}`,extra:{tmdbId:String(external.tmdb)}};if(external.imdb)return{id:`imdb:${external.imdb}`,extra:{imdbId:String(external.imdb)}};const byTitle=await resolveExternalMetadataIdsByTitle(titles,fetchImpl);if(byTitle.tmdb)return{id:`tmdb:${byTitle.tmdb}`,extra:{tmdbId:String(byTitle.tmdb)}};if(byTitle.imdb)return{id:`imdb:${byTitle.imdb}`,extra:{imdbId:String(byTitle.imdb)}};return null}
function extractReleaseYear(meta){const released=String(meta?.released||"").match(/^(\d{4})/);if(released)return Number(released[1]);const releaseInfo=String(meta?.releaseInfo||"").match(/^(\d{4})/);return releaseInfo?Number(releaseInfo[1]):null}
export {canonicalizeId,normalizeTitle,titleMatches} from "./canonical-utils.js";
export {resolveWithTvdbSeriesPageByTitle,resolveWithTvdbWebSearchByTitle} from "./canonical-providers.js";
export function clearCanonicalizationCache(){cache.clear();verifiedKitsuCache.clear();tvdbCache.clear();rootTvdbCache.clear();anibridgeTvdbCache.clear();wikidataTvdbCache.clear();wikidataTitleTvdbCache.clear();tvdbWebSearchCache.clear();tvdbSeriesPageCache.clear()}
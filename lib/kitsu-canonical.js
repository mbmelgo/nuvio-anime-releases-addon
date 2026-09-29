import {cache,verifiedKitsuCache,tvdbCache,rootTvdbCache,anibridgeTvdbCache,wikidataTvdbCache,wikidataTitleTvdbCache,tvdbWebSearchCache,tvdbSeriesPageCache} from "./canonical-state.js";
export {canonicalizeCatalogMetas} from "./canonical-identity.js";
export {canonicalizeId,normalizeTitle,titleMatches} from "./canonical-utils.js";
export {resolveWithTvdbSeriesPageByTitle,resolveWithTvdbWebSearchByTitle} from "./canonical-providers.js";
export function clearCanonicalizationCache(){cache.clear();verifiedKitsuCache.clear();tvdbCache.clear();rootTvdbCache.clear();anibridgeTvdbCache.clear();wikidataTvdbCache.clear();wikidataTitleTvdbCache.clear();tvdbWebSearchCache.clear();tvdbSeriesPageCache.clear()}

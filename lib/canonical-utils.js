export function normalizeTitle(value){return String(value||"").normalize("NFKC").toLowerCase().replace(/[’'`]/g,"").replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim()}
export function titleMatches(sourceTitle,candidate){const sources=titleVariants(sourceTitle);if(!sources.length||!candidate)return false;const candidates=[candidate.canonicalTitle,...Object.values(candidate.titles||{})].filter(Boolean).flatMap(titleVariants);return sources.some(source=>candidates.includes(source))}
function titleVariants(value){if(Array.isArray(value))return[...new Set(value.flatMap(titleVariants))];const normalized=normalizeTitle(value);return normalized?[normalized]:[]}
export function getMetaTitles(meta){const extra=meta?.extra||{};return[meta?.name,extra.titleEnglish,extra.titleRomaji,extra.titleNative].filter(Boolean)}
export function parseSourceId(id){const m=String(id).match(/^(mal|anilist):(\d+)$/i);return m?{source:m[1].toLowerCase(),id:m[2]}:null}
export function escapeSparqlString(value){return String(value).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\r?\n/g," ")}
export function canonicalizeId(sourceId,_kitsuId,tvdbId){return tvdbId?`tvdb:${String(tvdbId)}`:sourceId}

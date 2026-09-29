import test from "node:test";
import assert from "node:assert/strict";
import { canonicalizeCatalogMetas, clearCanonicalizationCache } from "../lib/kitsu-canonical.js";

function fetchFor(routes){return async(url,options={})=>{const body=String(options.body||"");const route=routes.find(entry=>entry.match(String(url),body));if(!route)return new Response(JSON.stringify({}),{status:404,headers:{"Content-Type":"application/json"}});return new Response(JSON.stringify(route.body),{status:route.status||200,headers:{"Content-Type":"application/json"}})}}

test.beforeEach(()=>clearCanonicalizationCache());

test("falls back to a validated TMDB identity when TVDB is a franchise-level mismatch",async()=>{
  const fetchImpl=fetchFor([
    {match:url=>url.includes("mappings.anibridge")&&url.includes("anilist:158871"),body:{data:{"anilist:158871":{"tvdb_show:76703":{}}}}},
    {match:url=>url.includes("arm.haglund.dev")&&url.includes("source=anilist"),body:{kitsu:46859}},
    {match:url=>url.includes("kitsu.io/api/edge/anime/46859/mappings"),body:{data:[{attributes:{externalSite:"themoviedb/tv",externalId:"220150"}},{attributes:{externalSite:"imdb",externalId:"tt26692417"}}]}},
    {match:url=>url.includes("kitsu.io/api/edge/anime/46859")&&!url.includes("/mappings"),body:{data:{id:"46859",attributes:{canonicalTitle:"Pocket Monsters (2023)",titles:{en:"Pokémon Horizons: The Series"}}}}},
    {match:url=>url.includes("api4.thetvdb.com/web/search/queries"),body:{results:[{hits:[{id:"series-76703",type:"series",name:"ポケットモンスター",aliases:["Pokémon Horizons: The Series"],first_air_time:"1997-04-01"}]}]}},
  ]);
  const [meta]=await canonicalizeCatalogMetas([{id:"anilist:158871",name:"Pokémon Horizons: The Series",released:"2023-04-14T00:00:00.000Z",extra:{anilistId:"158871",kitsuId:"46859",titleEnglish:"Pokémon Horizons: The Series"}}],{fetchImpl,now:1000});
  assert.equal(meta.id,"tmdb:220150");
  assert.equal(meta.extra.tmdbId,"220150");
});

test("resolves external metadata from a MAL identity when AniList is unavailable",async()=>{
  const fetchImpl=fetchFor([
    {match:url=>url.includes("mappings.anibridge")&&url.includes("mal:53876"),body:{data:{"mal:53876":{"tvdb_show:76703":{}}}}},
    {match:url=>url.includes("arm.haglund.dev")&&url.includes("source=myanimelist"),body:{kitsu:46859}},
    {match:url=>url.includes("kitsu.io/api/edge/anime/46859/mappings"),body:{data:[{attributes:{externalSite:"themoviedb/tv",externalId:"220150"}}]}},
    {match:url=>url.includes("kitsu.io/api/edge/anime/46859")&&!url.includes("/mappings"),body:{data:{id:"46859",attributes:{canonicalTitle:"Pocket Monsters (2023)",titles:{en:"Pokémon Horizons: The Series"}}}}},
    {match:url=>url.includes("api4.thetvdb.com/web/search/queries"),body:{results:[{hits:[{id:"series-76703",type:"series",name:"ポケットモンスター",aliases:["Pokémon Horizons: The Series"],first_air_time:"1997-04-01"}]}]}},
  ]);
  const [meta]=await canonicalizeCatalogMetas([{id:"mal:53876",name:"Pokémon Horizons: The Series",released:"2023-04-14T00:00:00.000Z",extra:{malId:"53876",kitsuId:"46859",titleEnglish:"Pokémon Horizons: The Series"}}],{fetchImpl,now:1000});
  assert.equal(meta.id,"tmdb:220150");
  assert.equal(meta.extra.tmdbId,"220150");
});

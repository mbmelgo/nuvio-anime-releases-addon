const ENDPOINT="https://graphql.anilist.co";
const cache=new Map();
const QUERY=`query ($malId: Int!) {
  Media(idMal: $malId, type: ANIME) {
    id
    idMal
    countryOfOrigin
    bannerImage
    coverImage { large extraLarge }
    title { romaji english native }
    studios { nodes { name isAnimationStudio } }
    characters(sort: ROLE, perPage: 20) {
      edges {
        role
        node { name { full } image { large } }
        voiceActors(language: JAPANESE, sort: RELEVANCE) { name { full } image { large } }
      }
    }
    trailer { id site thumbnail }
    streamingEpisodes { title thumbnail url site }
    externalLinks { site url type }
    recommendations(perPage: 10, sort: RATING_DESC) {
      nodes {
        mediaRecommendation {
          id
          idMal
          title { romaji english native }
          coverImage { large }
        }
      }
    }
  }
}`;
export async function getRichAniListByMal(malId){const id=Number(malId);if(!Number.isInteger(id)||id<=0)return null;if(cache.has(id))return cache.get(id);try{const response=await fetch(ENDPOINT,{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({query:QUERY,variables:{malId:id}})});if(!response.ok)return null;const payload=await response.json(),result=payload?.data?.Media||null;cache.set(id,result);return result;}catch(error){console.error("[rich-anilist]",error);return null;}}

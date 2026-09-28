import { ADDON_VERSION } from "./version.js";

const BASE_URL = "https://nuvio-anime-releases-addon-rho.vercel.app";
const GITHUB_URL = "https://github.com/mbmelgo/nuvio-anime-releases-addon";

const CATALOGS = [
  ["Ongoing", "ongoing", "Current and previous-season anime that are releasing"],
  ["Airing Today", "airing_today", "Anime with an episode airing today in Asia/Manila time"],
  ["New Episodes — Last 7 Days", "new_episodes", "Anime with recently aired episodes"],
  ["Next Episodes — Next 7 Days", "next_episodes", "Anime with scheduled episodes in the next 7 days"],
  ["Upcoming", "upcoming", "Not-yet-released anime in the next season"],
  ["Finished — Current Season", "finished_current", "Anime that finished during the current season"],
  ["Previous Season", "previous_season", "Anime from the immediately preceding season"],
  ["Popular — Current Season", "popular_current", "Current-season anime ordered by popularity"],
  ["Top Rated — Current Season", "top_rated_current", "Current-season anime ordered by AniList score"],
  ["Trending — Current Season", "trending_current", "Current-season anime ordered by AniList trending score"],
];

export default function handler(req, res) {
  const manifest = `${BASE_URL}/manifest.json`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b0f14">
  <title>Anime Releases for Nuvio · v${ADDON_VERSION}</title>
  <style>
    :root{color-scheme:dark;--bg:#0b0f14;--panel:#121821;--panel2:#18212c;--text:#f4f7fb;--muted:#9da9b8;--accent:#ff6f61;--border:#283341}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}.wrap{width:min(980px,calc(100% - 28px));margin:0 auto}header{padding:62px 0 30px}.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.82rem}h1{font-size:clamp(2.4rem,7vw,4.5rem);line-height:1.02;margin:12px 0 18px;letter-spacing:-.04em}.lead{max-width:800px;color:var(--muted);font-size:1.15rem}.panel{margin:22px 0;padding:26px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,var(--panel2),var(--panel)).catalog{display:grid;grid-template-columns:1fr auto;gap:12px 18px;align-items:center;padding:15px 0;border-top:1px solid var(--border)}.catalog:first-child{border-top:0}.catalog h3{margin:0;font-size:1rem}.catalog p{margin:3px 0 0;color:var(--muted);font-size:.9rem}.catalog a{overflow-wrap:anywhere}.note{color:var(--muted);font-size:.92rem}footer{padding:35px 0 55px;color:var(--muted)}a{color:#dfe7f0}@media(max-width:700px){.catalog{grid-template-columns:1fr}.secondary{margin:10px 0 0}}
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio / BingeCat / Stremio catalog addon · v${ADDON_VERSION}</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">Season-aware anime release, airing, seasonal, and ranking catalogs. Detailed metadata is delegated to BingeCat.</p>
  </header>
  <main class="wrap">
    <section class="panel">
      <h2>Install the addon</h2>
      <p>The addon provides release catalogs only. Detailed metadata is resolved by the configured metadata addon.</p>
      <label for="manifest-url">Production manifest URL</label>
      <div class="url"><code id="manifest-url">${manifest}</code></div>
      <a class="button" href="${manifest}">Install addon</a>
      <a class="button secondary" href="${GITHUB_URL}">GitHub</a>
    </section>

    <section class="panel">
      <h2>Supported catalogs</h2>
      <p class="note">Catalogs are generated dynamically from the current date and AniList data. Seasonal catalogs automatically move to the next season/year.</p>
      ${CATALOGS.map(([name, id, description]) => `
      <div class="catalog">
        <div><h3>${name}</h3><p>${description}</p></div>
        <a href="${BASE_URL}/catalog/series/${id}.json">${BASE_URL}/catalog/series/${id}.json</a>
      </div>`).join("")}
    </section>

    <section class="panel">
      <h2>Production architecture</h2>
      <p class="note">The current resolver is catalog-only. This addon does not provide detailed metadata or public <code>/meta</code> routes. Nuvio receives release/airing identities here, while BingeCat provides detailed metadata.</p>
    </section>
  </main>
  <footer class="wrap">Anime Releases for Nuvio · v${ADDON_VERSION}</footer>
</body>
</html>`;

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  return res.send(html);
}

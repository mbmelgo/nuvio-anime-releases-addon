import { ADDON_VERSION } from "./version.js";

const BASE_URL = "https://nuvio-anime-releases-addon-rho.vercel.app";
const GITHUB_URL = "https://github.com/mbmelgo/nuvio-anime-releases-addon";

const CATALOGS = [
  ["Upcoming Season", "upcoming_season", "Anime scheduled for the next season"],
  ["Current Season", "current_season", "Anime in the current season"],
  ["Previous Season", "previous_season", "Anime from the immediately preceding season"],
];

const SAMPLES = [
  ["BLEACH: The Calamity", "2026 · TV", "https://cms-assets.webediamovies.pro/cdn-cgi/image/dpr%3D1%2Cfit%3Dscale-down%2Cgravity%3Dauto%2Cmetadata%3Dnone%2Cquality%3D85%2Cwidth%3D2500/production/4756/d53fe958e3c641b1082f6e82c04ce267.jpg"],
  ["The Elusive Samurai Season 2", "2026 · TV", "https://pbs.twimg.com/media/HAKRIggXAAAFVF-.jpg"],
  ["Smoking Behind the Supermarket with You", "2026 · TV", "https://pbs.twimg.com/media/HEZIwiKaIAAvHzU.jpg"],
  ["The Frontier Lord Begins with Zero Subjects", "2026 · ONA", "https://ryomin0-anime.com/assets/og/ogp3.jpg"],
  ["Rich Girl Caretaker", "2026 · TV", "https://times-abema.ismcdn.jp/mwimgs/7/4/1448w/img_74e353953f533490a965afa2ca7585d57906421.jpg"],
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
    :root{color-scheme:dark;--bg:#0b0f14;--panel:#121821;--panel2:#18212c;--text:#f4f7fb;--muted:#9da9b8;--accent:#ff6f61;--border:#283341}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}.wrap{width:min(1100px,calc(100% - 28px));margin:0 auto}header{padding:62px 0 30px}.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.82rem}h1{font-size:clamp(2.4rem,7vw,4.5rem);line-height:1.02;margin:12px 0 18px;letter-spacing:-.04em}.lead{max-width:800px;color:var(--muted);font-size:1.15rem}.panel{margin:22px 0;padding:26px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,var(--panel2),var(--panel))}.url{display:block;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#090d12;overflow-wrap:anywhere;margin:10px 0 18px}code{color:#e7edf5}.button{display:inline-flex;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800;background:var(--accent);color:#101419}.secondary{background:var(--panel);color:var(--text);border:1px solid var(--border);margin-left:8px}.catalog{display:grid;grid-template-columns:1fr auto;gap:12px 18px;align-items:center;padding:15px 0;border-top:1px solid var(--border)}.catalog:first-child{border-top:0}.catalog h3{margin:0;font-size:1rem}.catalog p{margin:3px 0 0;color:var(--muted);font-size:.9rem}.catalog a{overflow-wrap:anywhere}.samples{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-top:18px}.sample{min-width:0}.poster{width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:10px;background:#22364d;display:block;border:1px solid var(--border)}.sample h3{font-size:.9rem;line-height:1.25;margin:9px 0 2px}.sample p{margin:0;color:var(--muted);font-size:.78rem}.note{color:var(--muted);font-size:.92rem}footer{padding:35px 0 55px;color:var(--muted)}a{color:#dfe7f0}@media(max-width:900px){.samples{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.catalog{grid-template-columns:1fr}.secondary{margin:10px 0 0}.samples{grid-template-columns:repeat(2,minmax(0,1fr))}}
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio anime catalog addon · v${ADDON_VERSION}</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">Season-aware anime catalogs powered by AniList. The addon provides catalog discovery and canonical AniList identities; detailed metadata is resolved by the configured metadata addon.</p>
  </header>
  <main class="wrap">
    <section class="panel">
      <h2>Install the addon</h2>
      <p>The production addon is AniList-only and uses <code>anilist:&lt;id&gt;</code> as the canonical catalog identity.</p>
      <div class="url"><code>${manifest}</code></div>
      <a class="button" href="${manifest}">Install addon</a>
      <a class="button secondary" href="${GITHUB_URL}">GitHub</a>
    </section>

    <section class="panel">
      <h2>Supported catalogs</h2>
      <p class="note">Three seasonal catalogs are exposed. The season is calculated dynamically from the current date, and AniList results use a 50-item page size.</p>
      ${CATALOGS.map(([name, id, description]) => `
      <div class="catalog">
        <div><h3>${name}</h3><p>${description}</p></div>
        <a href="${BASE_URL}/catalog/anime/${id}.json">${BASE_URL}/catalog/anime/${id}.json</a>
      </div>`).join("")}
    </section>

    <section class="panel">
      <h2>Sample anime artwork</h2>
      <p class="note">Representative 2026 anime artwork showing the type of titles exposed by the seasonal catalog. The images are illustrative and do not represent an exact Nuvio UI screenshot.</p>
      <div class="samples">
        ${SAMPLES.map(([title, meta, image]) => `<article class="sample"><img class="poster" src="${image}" alt="${title} poster" loading="lazy"><h3>${title}</h3><p>${meta}</p></article>`).join("")}
      </div>
    </section>

    <section class="panel">
      <h2>Production status</h2>
      <p class="note">v${ADDON_VERSION} is the current production release. Seasonal catalogs include TV, TV Short, ONA, OVA, Special, and Movie formats without filtering by release status. Validated 2026 baselines: Spring 99, Summer 105, Fall 94.</p>
    </section>

    <section class="panel">
      <h2>Architecture</h2>
      <p class="note"><code>AniList → anilist:&lt;id&gt; → Nuvio → metadata addon</code></p>
      <p class="note">The addon is catalog-focused and does not duplicate downstream detailed metadata/provider-mapping functionality.</p>
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

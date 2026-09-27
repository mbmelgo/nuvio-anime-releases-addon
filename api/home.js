const MANIFEST_URL = "https://nuvio-anime-releases-addon.vercel.app/manifest.json";
const GITHUB_URL = "https://github.com/mvincent475/nuvio-anime-releases-addon";

const CATALOGS = [
  ["ongoing", "Ongoing — current season", "Currently releasing TV anime, including still-releasing titles from the immediately previous season."],
  ["airing_today", "Airing Today", "TV anime with an episode airing during the current Philippine calendar day."],
  ["new_episodes", "New Episodes — Last 7 Days", "Shows with an episode released today or during the previous six Philippine calendar days."],
  ["next_episodes", "Next Episodes — Next 7 Days", "Shows with scheduled episodes during the next seven Philippine calendar days."],
  ["upcoming", "Upcoming — next season", "TV anime in the next season that are not yet released."],
  ["finished_current", "Finished — current season", "Current-season TV anime now marked finished by AniList."],
  ["previous_season", "Previous Season", "The immediately previous season for catching shows that crossed the seasonal boundary."],
  ["popular_current", "Popular — current season", "Current-season TV anime ordered by AniList popularity."],
  ["top_rated_current", "Top Rated — current season", "Current-season TV anime ordered by AniList score."],
  ["trending_current", "Trending — current season", "Current-season TV anime ordered by AniList trending activity."],
];

function catalogUrl(id) {
  return `/catalog/series/${id}.json`;
}

export default function handler(req, res) {
  const catalogCards = CATALOGS.map(([id, name, description], index) => `
    <article class="catalog-card">
      <div class="catalog-top"><span class="catalog-index">${String(index + 1).padStart(2, "0")}</span><span class="live">LIVE</span></div>
      <h3>${name}</h3>
      <p>${description}</p>
      <a href="${catalogUrl(id)}" target="_blank" rel="noopener">Open catalog JSON →</a>
    </article>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b0f14">
  <meta name="description" content="Anime Releases for Nuvio — live season-aware anime catalogs and rich metadata for Nuvio and Stremio-compatible clients.">
  <title>Anime Releases for Nuvio</title>
  <style>
    :root { color-scheme:dark; --bg:#0b0f14; --panel:#121821; --panel2:#18212c; --text:#f4f7fb; --muted:#9da9b8; --accent:#ff6f61; --border:#283341; --green:#71d99a; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
    a { color:inherit; }
    .wrap { width:min(1120px,calc(100% - 32px)); margin:0 auto; }
    header { padding:72px 0 54px; }
    .eyebrow { color:var(--accent); font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-size:.82rem; }
    h1 { font-size:clamp(2.4rem,7vw,4.8rem); line-height:1.02; margin:12px 0 18px; letter-spacing:-.04em; }
    .lead { max-width:800px; color:var(--muted); font-size:clamp(1.05rem,2vw,1.25rem); margin:0 0 28px; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; }
    .button { display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; border:1px solid var(--border); background:var(--panel); }
    .button.primary { background:var(--accent); border-color:var(--accent); color:#101419; }
    section { padding:34px 0; }
    h2 { font-size:clamp(1.6rem,3vw,2.2rem); margin:0 0 12px; letter-spacing:-.02em; }
    h3 { margin:0 0 8px; }
    .section-lead { color:var(--muted); max-width:820px; }
    .catalogs { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:24px; }
    .catalog-card { min-height:190px; padding:18px; border:1px solid var(--border); border-radius:14px; background:linear-gradient(180deg,var(--panel2),var(--panel)); display:flex; flex-direction:column; }
    .catalog-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .catalog-index { color:var(--muted); font-size:.8rem; font-weight:800; letter-spacing:.08em; }
    .live { color:var(--green); border:1px solid rgba(113,217,154,.35); background:rgba(113,217,154,.08); border-radius:999px; padding:2px 7px; font-size:.68rem; font-weight:800; }
    .catalog-card p { color:var(--muted); margin:0 0 14px; font-size:.92rem; }
    .catalog-card a { color:#dfe7f0; font-weight:700; text-decoration:none; margin-top:auto; }
    .install { margin:34px 0; padding:28px; border:1px solid var(--border); border-radius:18px; background:linear-gradient(135deg,#17212c,#10161e); }
    code { padding:2px 6px; border-radius:6px; background:#202a35; color:#e7edf5; overflow-wrap:anywhere; }
    .url { display:block; margin:14px 0 20px; padding:14px 16px; border:1px solid var(--border); border-radius:10px; background:#0a0e13; overflow-wrap:anywhere; }
    ol { color:var(--muted); padding-left:22px; }
    li { margin:6px 0; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:24px; }
    .card { background:linear-gradient(180deg,var(--panel2),var(--panel)); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
    .poster { display:block; width:100%; aspect-ratio:2/3; object-fit:cover; background:#202833; }
    .card-body { padding:14px; }
    .card-title { font-weight:700; line-height:1.3; }
    .card-meta { color:var(--muted); font-size:.9rem; margin-top:5px; }
    .features { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:22px; }
    .feature { padding:20px; border:1px solid var(--border); border-radius:14px; background:var(--panel); }
    .feature p { color:var(--muted); margin:6px 0 0; }
    footer { padding:44px 0 60px; color:var(--muted); border-top:1px solid var(--border); margin-top:30px; }
    .links { display:flex; flex-wrap:wrap; gap:18px; margin-top:12px; }
    .links a { color:#dfe7f0; }
    @media (max-width:900px) { .catalogs { grid-template-columns:repeat(2,1fr); } .features { grid-template-columns:1fr; } }
    @media (max-width:560px) { .wrap { width:min(100% - 22px,1120px); } header { padding-top:48px; } .catalogs,.grid { grid-template-columns:1fr; gap:10px; } }
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio / Stremio addon · v1.8.0</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">A free, season-aware anime catalog and metadata addon for Nuvio and Stremio-compatible clients. This page mirrors the addon catalog structure so you can inspect what is available even without opening Nuvio.</p>
    <div class="actions">
      <a class="button primary" href="${MANIFEST_URL}">Install in Nuvio</a>
      <a class="button" href="${GITHUB_URL}">View on GitHub</a>
      <a class="button" href="#catalogs">View all catalogs</a>
    </div>
  </header>

  <main class="wrap">
    <section class="install" id="install">
      <h2>Install</h2>
      <p class="section-lead">Use this manifest URL in Nuvio, Bingecat, or another compatible Stremio addon client.</p>
      <div class="url"><code>${MANIFEST_URL}</code></div>
      <ol>
        <li>Open the Addons section in Nuvio.</li>
        <li>Choose the install-from-URL / manifest option.</li>
        <li>Paste the manifest URL above and install the addon.</li>
        <li>Open the addon catalogs from the discovery/catalog area.</li>
      </ol>
    </section>

    <section id="catalogs">
      <h2>All catalogs</h2>
      <p class="section-lead">These are the same catalog IDs exposed by the current manifest. Click any catalog to inspect its live JSON response directly from the Vercel deployment. This makes the home page useful as a quick health check even when Nuvio is unavailable.</p>
      <div class="catalogs">${catalogCards}</div>
    </section>

    <section>
      <h2>Sample anime artwork</h2>
      <p class="section-lead">Representative current-season titles. The actual catalog artwork is supplied dynamically by AniList.</p>
      <div class="grid">
        <article class="card"><img class="poster" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178789-hNXjKFzUq7mk.jpg" alt="Mushoku Tensei Season 3"><div class="card-body"><div class="card-title">Mushoku Tensei S3</div><div class="card-meta">Adventure · Fantasy</div></div></article>
        <article class="card"><img class="poster" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx210031-TppgcHZh46LY.jpg" alt="You and I Are Polar Opposites Season 2"><div class="card-body"><div class="card-title">You &amp; I Are Polar Opposites S2</div><div class="card-meta">Romance · Comedy</div></div></article>
        <article class="card"><img class="poster" src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx185692-1a8huwOIx7gw.jpg" alt="Magilumiere Magical Girls Inc. Season 2"><div class="card-body"><div class="card-title">Magilumiere S2</div><div class="card-meta">Action · Fantasy</div></div></article>
      </div>
    </section>

    <section>
      <h2>Rich series details</h2>
      <p class="section-lead">The addon exposes dedicated metadata for its <code>mal:</code> and <code>anilist:</code> IDs so compatible clients can display a full series details page.</p>
      <div class="features">
        <div class="feature"><h3>Series metadata</h3><p>Titles, descriptions, genres, runtime, release dates, country, posters, backgrounds, scores, popularity, trending activity, favourites, source, studio, and external links.</p></div>
        <div class="feature"><h3>Seasons &amp; episodes</h3><p>Episode data is exposed through the metadata endpoint for compatible clients, allowing season and episode browsing when the client requests it.</p></div>
        <div class="feature"><h3>Automatic updates</h3><p>Season transitions, airing schedules, and catalog contents update automatically. No cron job or manually maintained anime list is required.</p></div>
      </div>
    </section>

    <section>
      <h2>Data sources</h2>
      <div class="features">
        <div class="feature"><h3>AniList</h3><p>Primary source for anime metadata, season classification, status, artwork, scores, popularity, trending, franchise relations, and airing schedules.</p></div>
        <div class="feature"><h3>Jikan</h3><p>Best-effort episode enrichment for known MyAnimeList entries, including episode titles, synopses, dates, and thumbnails.</p></div>
        <div class="feature"><h3>Catalog only</h3><p>This addon does not provide video streams, downloads, torrent hashes, or playback sources. Playback remains dependent on separate stream addons.</p></div>
      </div>
    </section>

    <section>
      <h2>Useful endpoints</h2>
      <p><a href="/manifest.json">Manifest</a> · <a href="/catalog/series/ongoing.json">Ongoing</a> · <a href="/catalog/series/new_episodes.json">New episodes</a> · <a href="/catalog/series/next_episodes.json">Next episodes</a></p>
      <p class="section-lead">The complete project documentation, deployment instructions, API behavior, limitations, and examples are available in the repository README.</p>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <strong>Anime Releases for Nuvio</strong>
      <div class="links">
        <a href="${GITHUB_URL}">GitHub</a>
        <a href="${MANIFEST_URL}">Manifest</a>
        <a href="${GITHUB_URL}/blob/main/README.md">Full README</a>
      </div>
      <p>Anime metadata and promotional artwork remain the property of their respective rights holders.</p>
    </div>
  </footer>
</body>
</html>`;

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  return res.send(html);
}

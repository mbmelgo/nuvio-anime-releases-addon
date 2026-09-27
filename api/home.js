const BASE_URL = "https://nuvio-anime-releases-addon-rho.vercel.app";
const MANIFEST_URL = `${BASE_URL}/manifest.json`;
const GITHUB_URL = "https://github.com/mbmelgo/nuvio-anime-releases-addon";
const VERSION = "2.0.0";

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
  ["trending_current", "Trending — current season", "Current-season TV anime ordered by AniList trending activity."]
];

function catalogUrl(id) { return `/catalog/series/${id}.json`; }

export default function handler(req, res) {
  const catalogCards = CATALOGS.map(([id, name, description], index) => `
    <article class="catalog-card">
      <div class="catalog-top"><span class="index">${String(index + 1).padStart(2, "0")}</span><span class="live">LIVE</span></div>
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
  <meta name="description" content="Anime Releases for Nuvio v2.0.0 — season-aware anime catalogs and metadata for Nuvio, BingeCat, and Stremio-compatible clients.">
  <title>Anime Releases for Nuvio · v${VERSION}</title>
  <style>
    :root { color-scheme:dark; --bg:#0b0f14; --panel:#121821; --panel2:#18212c; --text:#f4f7fb; --muted:#9da9b8; --accent:#ff6f61; --border:#283341; --green:#71d99a; }
    * { box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { margin:0; background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; line-height:1.6; }
    a { color:inherit; }
    .wrap { width:min(1120px,calc(100% - 32px)); margin:0 auto; }
    header { padding:72px 0 54px; }
    .eyebrow { color:var(--accent); font-weight:800; letter-spacing:.08em; text-transform:uppercase; font-size:.82rem; }
    h1 { font-size:clamp(2.4rem,7vw,4.8rem); line-height:1.02; margin:12px 0 18px; letter-spacing:-.04em; }
    .lead { max-width:820px; color:var(--muted); font-size:clamp(1.05rem,2vw,1.25rem); margin:0 0 28px; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; }
    .button { display:inline-flex; align-items:center; justify-content:center; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:700; border:1px solid var(--border); background:var(--panel); }
    .button.primary { background:var(--accent); border-color:var(--accent); color:#101419; }
    section { padding:34px 0; }
    h2 { font-size:clamp(1.6rem,3vw,2.2rem); margin:0 0 12px; letter-spacing:-.02em; }
    h3 { margin:0 0 8px; }
    .section-lead { color:var(--muted); max-width:850px; }
    .notice { margin-top:24px; padding:18px 20px; border:1px solid var(--border); border-radius:14px; background:var(--panel); color:var(--muted); }
    .catalogs { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:24px; }
    .catalog-card { min-height:190px; padding:18px; border:1px solid var(--border); border-radius:14px; background:linear-gradient(180deg,var(--panel2),var(--panel)); display:flex; flex-direction:column; }
    .catalog-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .index { color:var(--muted); font-size:.8rem; font-weight:800; letter-spacing:.08em; }
    .live { color:var(--green); border:1px solid rgba(113,217,154,.35); background:rgba(113,217,154,.08); border-radius:999px; padding:2px 7px; font-size:.68rem; font-weight:800; }
    .catalog-card p { color:var(--muted); margin:0 0 14px; font-size:.92rem; }
    .catalog-card a { color:#dfe7f0; font-weight:700; text-decoration:none; margin-top:auto; }
    .install { margin:10px 0 34px; padding:28px; border:1px solid var(--border); border-radius:18px; background:linear-gradient(135deg,#17212c,#10161e); }
    code { padding:2px 6px; border-radius:6px; background:#202a35; color:#e7edf5; overflow-wrap:anywhere; }
    .url { display:block; margin:14px 0 20px; padding:14px 16px; border:1px solid var(--border); border-radius:10px; background:#0a0e13; overflow-wrap:anywhere; }
    ol { color:var(--muted); padding-left:22px; }
    li { margin:6px 0; }
    .features { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:22px; }
    .feature { padding:20px; border:1px solid var(--border); border-radius:14px; background:var(--panel); }
    .feature p { color:var(--muted); margin:6px 0 0; }
    .endpoint-list { display:grid; gap:10px; margin-top:20px; }
    .endpoint { display:block; padding:13px 15px; border:1px solid var(--border); border-radius:10px; background:var(--panel); text-decoration:none; }
    footer { padding:44px 0 60px; color:var(--muted); border-top:1px solid var(--border); margin-top:30px; }
    .links { display:flex; flex-wrap:wrap; gap:18px; margin-top:12px; }
    .links a { color:#dfe7f0; }
    @media (max-width:900px) { .catalogs { grid-template-columns:repeat(2,1fr); } .features { grid-template-columns:1fr; } }
    @media (max-width:560px) { .wrap { width:min(100% - 22px,1120px); } header { padding-top:48px; } .catalogs { grid-template-columns:1fr; gap:10px; } }
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio / BingeCat / Stremio addon · v${VERSION}</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">A free, season-aware anime catalog and metadata addon with ten dynamic series catalogs and a multi-season metadata resolver designed for long-running anime.</p>
    <div class="actions">
      <a class="button primary" href="${MANIFEST_URL}">Install in Nuvio</a>
      <a class="button" href="${GITHUB_URL}">View on GitHub</a>
      <a class="button" href="#catalogs">View catalogs</a>
    </div>
    <div class="notice"><strong>Current v2.0.0 status:</strong> GitHub is the source of truth, automatic Vercel Git deployments are disabled, and production metadata currently routes to the v4 resolver while the v5 refactor is being validated.</div>
  </header>

  <main class="wrap">
    <section class="install" id="install">
      <h2>Install</h2>
      <p class="section-lead">Use the current manifest URL in Nuvio, BingeCat, or another compatible Stremio addon client.</p>
      <div class="url"><code>${MANIFEST_URL}</code></div>
      <ol>
        <li>Open the Addons section.</li>
        <li>Choose the install-from-URL / manifest option.</li>
        <li>Paste the manifest URL above and install the addon.</li>
        <li>Open the addon catalogs from the discovery/catalog area.</li>
      </ol>
    </section>

    <section id="catalogs">
      <h2>Live catalogs</h2>
      <p class="section-lead">These catalog endpoints are generated dynamically from current anime data. Open a catalog JSON directly to inspect the response served by this deployment.</p>
      <div class="catalogs">${catalogCards}</div>
    </section>

    <section>
      <h2>Metadata &amp; episodes</h2>
      <p class="section-lead">The addon accepts MAL IDs such as <code>mal:39535</code> and returns Nuvio-compatible series metadata. v2.0.0 uses AniList/Jikan franchise relationships, AniZip episode data, source-aware filtering, normalization, and deduplication.</p>
      <div class="features">
        <div class="feature"><h3>Multi-season</h3><p>Related TV entries are discovered as a franchise rather than assuming a single direct sequel chain.</p></div>
        <div class="feature"><h3>Long-running</h3><p>Long-running series are not artificially capped at 100 episodes. One Piece is the primary stress test.</p></div>
        <div class="feature"><h3>Lean responses</h3><p>Episode objects contain only the fields needed by Nuvio: ID, title, season, episode, and available release/thumbnail data.</p></div>
      </div>
    </section>

    <section>
      <h2>Source-aware filtering</h2>
      <p class="section-lead">Normal TV episodes are separated from specials and other non-standard material using source metadata first, with title matching only as a fallback. This is particularly important for One Piece, where entries such as Episode of Nami, Episode of Merry, Episode of Sabo, Fan Letter, and Barto's Secret Room must not automatically become normal numbered TV episodes.</p>
    </section>

    <section>
      <h2>Key endpoints</h2>
      <div class="endpoint-list">
        <a class="endpoint" href="/manifest.json">Manifest → /manifest.json</a>
        <a class="endpoint" href="/catalog/series/ongoing.json">Ongoing → /catalog/series/ongoing.json</a>
        <a class="endpoint" href="/catalog/series/new_episodes.json">New episodes → /catalog/series/new_episodes.json</a>
        <a class="endpoint" href="/catalog/series/next_episodes.json">Next episodes → /catalog/series/next_episodes.json</a>
        <a class="endpoint" href="/meta/series/mal%3A39535.json">Mushoku Tensei metadata → /meta/series/mal:39535.json</a>
      </div>
    </section>

    <section>
      <h2>Data sources</h2>
      <div class="features">
        <div class="feature"><h3>AniList</h3><p>Primary source for metadata, season/status information, artwork, airing schedules, and franchise relationships.</p></div>
        <div class="feature"><h3>Jikan</h3><p>MAL metadata, relationships, episode data, and fallback information. It is not treated as the sole authority for long-running anime.</p></div>
        <div class="feature"><h3>AniZip</h3><p>MAL → AniList mapping and larger episode datasets with titles, dates, thumbnails, and season/episode information.</p></div>
      </div>
    </section>

    <section>
      <h2>Deployment model</h2>
      <p class="section-lead">GitHub is the source of truth. Automatic Vercel Git deployments are intentionally disabled so development can proceed without consuming a deployment for every commit. Vercel deployments are performed manually for consolidated candidates.</p>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <strong>Anime Releases for Nuvio · v${VERSION}</strong>
      <div class="links">
        <a href="${GITHUB_URL}">GitHub</a>
        <a href="${MANIFEST_URL}">Manifest</a>
        <a href="${GITHUB_URL}/blob/main/README.md">README</a>
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

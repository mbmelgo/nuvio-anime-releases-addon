import { ADDON_VERSION } from "./version.js";

const BASE_URL = "https://nuvio-anime-releases-addon-rho.vercel.app";
const GITHUB_URL = "https://github.com/mbmelgo/nuvio-anime-releases-addon";

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
    :root{color-scheme:dark;--bg:#0b0f14;--panel:#121821;--panel2:#18212c;--text:#f4f7fb;--muted:#9da9b8;--accent:#ff6f61;--border:#283341}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}.wrap{width:min(900px,calc(100% - 28px));margin:0 auto}header{padding:70px 0 32px}.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.82rem}h1{font-size:clamp(2.4rem,7vw,4.5rem);line-height:1.02;margin:12px 0 18px;letter-spacing:-.04em}.lead{max-width:760px;color:var(--muted);font-size:1.15rem}.panel{margin:22px 0;padding:26px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,var(--panel2),var(--panel)).url}.url{display:block;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#090d12;overflow-wrap:anywhere;margin:10px 0 18px}code{color:#e7edf5}.button{display:inline-flex;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800;background:var(--accent);color:#101419}.secondary{background:var(--panel);color:var(--text);border:1px solid var(--border);margin-left:8px}.note{color:var(--muted);font-size:.92rem}footer{padding:35px 0 55px;color:var(--muted)}a{color:#dfe7f0}@media(max-width:650px){.secondary{margin:10px 0 0}}
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio / BingeCat / Stremio catalog addon · v${ADDON_VERSION}</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">Season-aware anime release and airing catalogs. Detailed metadata is delegated to BingeCat.</p>
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
      <h2>Production resolver</h2>
      <p class="note">The v5 catalog-only resolver is the sole supported production architecture. Metadata routes are intentionally not provided by this addon.</p>
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

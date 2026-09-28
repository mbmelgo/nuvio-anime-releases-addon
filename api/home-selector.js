import { ADDON_VERSION } from "./version.js";

const BASE_URL = "https://nuvio-anime-releases-addon-rho.vercel.app";
const GITHUB_URL = "https://github.com/mbmelgo/nuvio-anime-releases-addon";

export default function handler(req, res) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b0f14">
  <title>Anime Releases for Nuvio · v${ADDON_VERSION}</title>
  <style>
    :root{color-scheme:dark;--bg:#0b0f14;--panel:#121821;--panel2:#18212c;--text:#f4f7fb;--muted:#9da9b8;--accent:#ff6f61;--border:#283341;--green:#71d99a}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -10%,#1c2633 0,var(--bg) 45%);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6}.wrap{width:min(900px,calc(100% - 28px));margin:0 auto}header{padding:70px 0 32px}.eyebrow{color:var(--accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.82rem}h1{font-size:clamp(2.4rem,7vw,4.5rem);line-height:1.02;margin:12px 0 18px;letter-spacing:-.04em}.lead{max-width:760px;color:var(--muted);font-size:1.15rem}.panel{margin:22px 0;padding:26px;border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,var(--panel2),var(--panel))}.choices{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}.choice{padding:20px;border:1px solid var(--border);border-radius:14px;background:var(--panel);cursor:pointer}.choice.selected{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}.choice h2{margin:0 0 5px}.choice p{color:var(--muted);margin:0}.badge{display:inline-block;margin-top:10px;padding:3px 8px;border-radius:999px;font-size:.72rem;font-weight:800;background:rgba(113,217,154,.08);color:var(--green);border:1px solid rgba(113,217,154,.3)}label{display:block;font-weight:700;margin-bottom:8px}.url{display:block;padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#090d12;overflow-wrap:anywhere;margin:10px 0 18px}code{color:#e7edf5}.button{display:inline-flex;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800;background:var(--accent);color:#101419}.secondary{background:var(--panel);color:var(--text);border:1px solid var(--border);margin-left:8px}.note{color:var(--muted);font-size:.92rem}footer{padding:35px 0 55px;color:var(--muted)}a{color:#dfe7f0}@media(max-width:650px){.choices{grid-template-columns:1fr}.secondary{margin:10px 0 0}}
  </style>
</head>
<body>
  <header class="wrap">
    <div class="eyebrow">Nuvio / BingeCat / Stremio addon · v${ADDON_VERSION}</div>
    <h1>Anime Releases for Nuvio</h1>
    <p class="lead">Choose which metadata resolver you want the installed addon to use. This lets us validate the refactored v5 resolver without replacing the stable v4 production resolver.</p>
  </header>
  <main class="wrap">
    <section class="panel">
      <h2>Choose metadata resolver</h2>
      <div class="choices">
        <div class="choice selected" data-resolver="v4">
          <h2>v4</h2>
          <p>Current production resolver. Use this for the stable configuration.</p>
          <span class="badge">PRODUCTION</span>
        </div>
        <div class="choice" data-resolver="v5">
          <h2>v5</h2>
          <p>Refactored candidate. Use this for validation and regression testing.</p>
          <span class="badge">CANDIDATE</span>
        </div>
      </div>
      <label for="manifest-url">Manifest URL</label>
      <div class="url"><code id="manifest-url">${BASE_URL}/v4/manifest.json</code></div>
      <a class="button" id="install" href="${BASE_URL}/v4/manifest.json">Install selected resolver</a>
      <a class="button secondary" href="${GITHUB_URL}">GitHub</a>
      <p class="note">v4 and v5 use separate addon IDs, so both can be installed simultaneously for side-by-side testing. The root manifest remains the existing v4-compatible manifest until we deliberately promote v5.</p>
    </section>
    <section class="panel">
      <h2>Why this exists</h2>
      <p class="note">We are keeping Vercel deployments consolidated because deployment capacity is limited. Resolver selection happens through the manifest URL, so changing the selection does not require a new Vercel deployment once these routes are live.</p>
    </section>
  </main>
  <footer class="wrap">Anime Releases for Nuvio · v${ADDON_VERSION}</footer>
  <script>
    const base = ${JSON.stringify(BASE_URL)};
    const choices = [...document.querySelectorAll('.choice')];
    const url = document.getElementById('manifest-url');
    const install = document.getElementById('install');
    function selectResolver(resolver){
      const manifest = base + '/' + resolver + '/manifest.json';
      choices.forEach((choice) => choice.classList.toggle('selected', choice.dataset.resolver === resolver));
      url.textContent = manifest;
      install.href = manifest;
    }
    choices.forEach((choice) => choice.addEventListener('click', () => selectResolver(choice.dataset.resolver)));
  </script>
</body>
</html>`;

  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=1800");
  return res.send(html);
}

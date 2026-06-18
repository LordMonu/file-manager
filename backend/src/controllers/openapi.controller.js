import { buildOpenApiDocument } from '../services/openapi.service.js';

export function getOpenApiDocument(_req, res) {
  res.json(buildOpenApiDocument());
}

export function getApiDocsPage(req, res) {
  const specUrl = `${req.protocol}://${req.get('host')}/openapi.json`;

  res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Manage Files API Docs</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5efe4;
        --panel: #fffdf8;
        --ink: #1c1917;
        --muted: #57534e;
        --accent: #c2410c;
        --line: #e7d7c2;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top left, rgba(194, 65, 12, 0.14), transparent 32%),
          linear-gradient(180deg, #f8f3ea 0%, var(--bg) 100%);
        color: var(--ink);
      }
      .wrap {
        max-width: 960px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero {
        padding: 28px;
        border: 1px solid var(--line);
        background: rgba(255, 253, 248, 0.88);
      }
      h1 {
        margin: 0 0 10px;
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 0.95;
        font-weight: 700;
      }
      p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.6;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
        margin-top: 18px;
      }
      .card {
        padding: 18px;
        border: 1px solid var(--line);
        background: var(--panel);
      }
      .eyebrow {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
        margin-bottom: 8px;
      }
      code, pre {
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      }
      pre {
        margin: 24px 0 0;
        padding: 18px;
        overflow: auto;
        border: 1px solid var(--line);
        background: #201a17;
        color: #fef7ed;
        line-height: 1.5;
        font-size: 0.9rem;
      }
      a {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <section class="hero">
        <div class="eyebrow">Manage Files</div>
        <h1>API Reference</h1>
        <p>Machine-readable OpenAPI is available at <a href="${specUrl}">${specUrl}</a>. This page renders a live snapshot from that spec so integrations stay aligned with the backend.</p>
      </section>
      <section class="grid">
        <article class="card">
          <div class="eyebrow">Auth</div>
          <p>Development requests can still use <code>x-user-role</code> and <code>x-client-ids</code>, while production JWT login and admin user management are documented in the spec.</p>
        </article>
        <article class="card">
          <div class="eyebrow">Uploads</div>
          <p>Uploads are always mediated by the backend through signed URLs, with client isolation enforced before URL generation and content access.</p>
        </article>
        <article class="card">
          <div class="eyebrow">Protection</div>
          <p>Rate limiting, audit logging, and signed read URLs are described directly in the spec so deploy and frontend work can depend on one source of truth.</p>
        </article>
      </section>
      <pre id="spec">Loading spec...</pre>
    </div>
    <script>
      fetch(${JSON.stringify(specUrl)})
        .then((response) => response.json())
        .then((spec) => {
          document.getElementById('spec').textContent = JSON.stringify(spec, null, 2);
        })
        .catch((error) => {
          document.getElementById('spec').textContent = 'Failed to load spec: ' + error.message;
        });
    </script>
  </body>
</html>`);
}

/**
 * GET /api/debug
 * Shows what redirect_uri and client_id will be used in the OAuth flow.
 * Use this to verify your Google Cloud Console settings match exactly.
 */

const url = require("url");

module.exports = async (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const redirectUri = `${proto}://${host}/api/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || "(NOT SET — add GOOGLE_CLIENT_ID in Vercel env vars)";

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Cache-Control", "no-store");
  res.end(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OAuth Debug Info</title>
<style>
  body{font-family:system-ui,sans-serif;background:#090d16;color:#e2e8f0;padding:2rem;max-width:700px;margin:0 auto;}
  h2{color:#60a5fa;}
  .row{background:#131b2e;border:1px solid #233150;border-radius:8px;padding:1rem;margin:.8rem 0;}
  .label{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem;}
  .val{font-family:monospace;font-size:.9rem;color:#f1f5f9;word-break:break-all;}
  .ok{color:#4ade80;font-weight:700;}
  .err{color:#f87171;font-weight:700;}
  a{color:#38bdf8;}
</style>
</head><body>
  <h2>🔍 OAuth Debug Info</h2>
  <p style="color:#94a3b8;">Copy the exact values below into your Google Cloud Console.</p>

  <div class="row">
    <div class="label">Redirect URI (register this in Google Cloud Console)</div>
    <div class="val">${redirectUri}</div>
  </div>

  <div class="row">
    <div class="label">Client ID (from GOOGLE_CLIENT_ID env var)</div>
    <div class="val ${clientId.includes("NOT SET") ? "err" : "ok"}">${clientId}</div>
  </div>

  <div class="row">
    <div class="label">Host detected</div>
    <div class="val">${host}</div>
  </div>

  <div class="row">
    <div class="label">Protocol detected</div>
    <div class="val">${proto}</div>
  </div>

  <hr style="border-color:#233150;margin:1.5rem 0;" />
  <p style="color:#94a3b8;font-size:.85rem;">
    Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank">Google Cloud Console → Credentials</a><br/>
    → Click your OAuth 2.0 Client ID<br/>
    → Under <strong>Authorized redirect URIs</strong>, add:<br/>
    <code style="color:#4ade80;font-family:monospace;">${redirectUri}</code>
  </p>

  <a href="/">← Back to App</a>
</body></html>`);
};

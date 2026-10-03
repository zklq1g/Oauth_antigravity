/**
 * GET /api/start
 * Generates the Google OAuth URL and redirects the user directly to Google sign-in.
 * Uses the Vercel deployment URL as the redirect_uri so Google bounces back here.
 */

const crypto = require("crypto");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

module.exports = async (req, res) => {
  if (!CLIENT_ID) {
    res.setHeader("Content-Type", "text/html");
    res.status(500).end(`
      <h2 style="font-family:sans-serif;color:#ef4444;">⚠️ Server Misconfigured</h2>
      <p style="font-family:sans-serif;">GOOGLE_CLIENT_ID is not set in Vercel Environment Variables.</p>
    `);
    return;
  }

  const state = crypto.randomUUID();

  // Build redirect_uri from the incoming request host (works on any Vercel deployment URL)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const redirectUri = `${proto}://${host}/api/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();

  // Pass state and redirectUri in a secure session cookie so callback can verify
  res.setHeader(
    "Set-Cookie",
    `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600; Secure`
  );
  res.setHeader("Cache-Control", "no-store");

  // Redirect the browser directly to Google
  res.writeHead(302, { Location: authUrl });
  res.end();
};

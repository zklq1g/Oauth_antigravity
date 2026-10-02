/**
 * GET /api/start
 * Generates the Google OAuth authorization URL.
 */

const crypto = require("crypto");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const REDIRECT_URI = "http://localhost:9999/auth/callback";

const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

module.exports = async (req, res) => {
  if (!CLIENT_ID) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).end(
      JSON.stringify({
        error:
          "Missing GOOGLE_CLIENT_ID. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Vercel Project Settings > Environment Variables.",
      })
    );
    return;
  }

  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({ url: authUrl, state }));
};

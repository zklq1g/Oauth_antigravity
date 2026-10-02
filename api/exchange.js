/**
 * POST /api/exchange or GET /api/exchange
 * Exchanges a Google OAuth authorization code for a refresh token and access token.
 */

const https = require("https");
const url = require("url");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:9999/auth/callback";

function extractAuthCode(rawInput) {
  if (!rawInput) return null;
  const trimmed = rawInput.trim();
  try {
    if (trimmed.includes("code=")) {
      const parsedUrl = new URL(
        trimmed.startsWith("http") ? trimmed : `http://localhost?${trimmed}`
      );
      return parsedUrl.searchParams.get("code") || trimmed;
    }
  } catch (_) {}
  return trimmed;
}

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
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error("Bad JSON from Google: " + raw));
          }
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
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error("Bad JSON from userinfo: " + raw));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  // CORS support
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).end(
      JSON.stringify({
        error:
          "Server configuration missing: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in Vercel Environment Variables.",
      })
    );
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let rawInput =
    parsedUrl.query.input || parsedUrl.query.url || parsedUrl.query.code;

  if (!rawInput && req.method === "POST") {
    if (typeof req.body === "object" && req.body !== null) {
      rawInput = req.body.input || req.body.url || req.body.code;
    } else {
      let body = "";
      await new Promise((resolve) => {
        req.on("data", (c) => (body += c));
        req.on("end", resolve);
      });
      try {
        const parsed = JSON.parse(body);
        rawInput = parsed.input || parsed.url || parsed.code;
      } catch (_) {
        const params = new URLSearchParams(body);
        rawInput =
          params.get("input") || params.get("url") || params.get("code");
      }
    }
  }

  const code = extractAuthCode(rawInput);
  if (!code) {
    res.setHeader("Content-Type", "application/json");
    res.status(400).end(
      JSON.stringify({ error: "Missing authorization code or callback URL." })
    );
    return;
  }

  try {
    const tokenResp = await httpsPost("oauth2.googleapis.com", "/token", {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });

    if (tokenResp.error) {
      res.setHeader("Content-Type", "application/json");
      res.status(400).end(
        JSON.stringify({
          error:
            tokenResp.error_description ||
            `Token exchange failed (${tokenResp.error})`,
        })
      );
      return;
    }

    let userInfo = { email: "Unknown", name: "" };
    try {
      userInfo = await httpsGet(
        "www.googleapis.com",
        "/oauth2/v2/userinfo",
        tokenResp.access_token
      );
    } catch (_) {}

    const result = {
      email: userInfo.email || "Unknown",
      name: userInfo.name || "",
      refresh_token: tokenResp.refresh_token,
      access_token: tokenResp.access_token,
      expires_in: tokenResp.expires_in,
    };

    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify({ success: true, account: result }));
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).end(JSON.stringify({ error: err.message }));
  }
};

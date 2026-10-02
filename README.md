# Antigravity Token Collector — Cloud Edition (Vercel)

A 24/7 cloud exchanger for Google OAuth refresh tokens that works **even when your computer is completely turned off**.

- **Zero dependencies** — runs on Vercel's serverless Node.js runtime.
- **Works on mobile** — copy the link, send it to a friend, paste their returned URL, and collect your token directly from your phone.

---

## 🚀 1-Minute Deployment to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import this repository.
2. In **Environment Variables**, add:
   * `GOOGLE_CLIENT_ID`
   * `GOOGLE_CLIENT_SECRET`
3. Click **Deploy**.
4. You now have a live URL: `https://your-project.vercel.app`!

---

## 📱 How to Use It (From Your Phone / Anywhere)

1. Open your Vercel URL: `https://your-project.vercel.app` on your phone.
2. Tap **📋 Copy Google Link** (or tap **💬 Copy Chat Message** for a pre-written WhatsApp message).
3. Send it to your friend.
4. Your friend signs in on their phone, clicks **Allow**, and sees the *"This site can't be reached"* (localhost:9999) screen.
5. Your friend copies the URL from their browser address bar and messages it back to you.
6. Open your Vercel URL, paste the link in the box, and tap **⚡ Convert to Refresh Token**.
7. Your refresh token is displayed immediately and saved to your phone's browser history!
8. When you're back at your PC, paste the token into Antigravity Tools → **Accounts** → **Bulk Import**.

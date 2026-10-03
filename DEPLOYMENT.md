# Stark Anime — Deployment & Hosting Guide

## Quick Deployment Summary

Stark Anime is configured for instant 1-click deployment across major cloud platforms:

| Platform | Deployment Type | Config File |
| --- | --- | --- |
| **Vercel** | Serverless + Vite Static Frontend | `vercel.json` |
| **Render / Railway / Render** | Node.js / Bun Full-Stack Container | `package.json` |
| **Cloudflare Workers (Bot)** | Serverless Telegram Bot | `wrangler.toml` / `bot/wrangler.toml` |
| **VPS (Ubuntu/Debian)** | PM2 + Express + Nginx | `server.ts` |

---

## 1. Deploying on Vercel (Fastest)

1. Connect your GitHub repository to Vercel.
2. The project includes `vercel.json` which automatically sets up:
   - Frontend static build (`dist/`)
   - API endpoints routing to `/api/index.ts`
3. Add Environment Variables in Vercel settings:
   - `DATABASE_URL` (Your Neon connection string)
   - `JWT_SECRET` (A secret key for admin session signatures)
   - `TELEGRAM_BOT_TOKEN` (BotFather token)
4. Deploy!

---

## 2. Deploying on Render / Railway / Docker / VPS

### Environment Variables
```env
PORT=3000
DATABASE_URL=postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require
JWT_SECRET=your_secret_32_character_token
TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
```

### Build & Run Commands
- **Build Command:** `bun run build` or `npm run build`
- **Start Command:** `bun run start` or `npm run start`

---

## 3. Telegram Bot Runner

The bot can run in two modes:
1. **Cloudflare Worker Mode (`bot/worker.js`):** Deploy using `wrangler deploy` inside `bot/`.
2. **Standalone Long-Polling Runner (`bot/index.js`):** Run `bun run bot/index.js` or `node bot/index.js` on any server.

---

## 4. Default Admin Credentials

- **Username:** `rajpapa` or `admin`
- **Password:** `28@Rajpapa`

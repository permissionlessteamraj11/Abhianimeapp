# ⚡ Stark Anime (KuroStream)

Stark Anime is a full-stack, mobile-optimized Anime & Movie streaming web application built with **React 19, Vite, Tailwind CSS v4, Express, and Neon PostgreSQL**.

---

## 🚀 Easy Deployment Options (1-Click Deployment)

### Option 1: Vercel (Recommended — Zero Config)
1. Fork or import this GitHub repository into Vercel.
2. Set Environment Variables in Vercel Dashboard (Optional for Neon DB):
   - `DATABASE_URL`: `postgresql://...` (Your Neon connection string)
   - `TELEGRAM_BOT_TOKEN`: `your_telegram_bot_token`
   - `JWT_SECRET`: `your_random_secret_string`
3. Click **Deploy**. Vercel automatically detects `vercel.json` and builds both frontend and serverless API functions!

---

### Option 2: Render.com / Railway / Koyeb
1. Connect repository to Render / Railway.
2. Build Command: `bun install && bun run build` (or `npm install && npm run build`)
3. Start Command: `bun run start` (or `npm run start` / `npx tsx server.ts`)
4. Add environment variables (`DATABASE_URL`, `PORT=3000`, `TELEGRAM_BOT_TOKEN`).

---

### Option 3: VPS / Ubuntu Server (Nginx + PM2)
```bash
# 1. Clone repository
git clone <your-repo-url> /var/www/stark-anime
cd /var/www/stark-anime

# 2. Install dependencies & build
bun install # or npm install
bun run build # or npm run build

# 3. Start with PM2
npm install -g pm2
pm2 start "bun run start" --name "stark-anime"
pm2 save
```

---

## 🔑 Default Credentials & Admin Access

- **Admin Login Route:** Open website and append `/admin` or click Admin in profile.
- **Username:** `rajpapa` or `admin`
- **Password:** `28@Rajpapa`

---

## 🛠️ Local Development

```bash
# Install dependencies
bun install

# Run dev server
bun run dev

# Run type check (lint)
bun run lint

# Production build
bun run build
```

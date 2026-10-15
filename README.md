# ⚡ STARK ANIME - Full Vercel Frontend + VPS Backend Deployment Guide

This guide covers setting up **STARK ANIME** with a hybrid architecture:
- **Frontend:** Hosted on **Vercel** (React 19 + Vite SPA, ultra-fast global CDN).
- **Backend:** Hosted on **VPS** (Express REST API, local persistent JSON database, FFmpeg multi-quality transcoder engine, Telegram bot, PM2, and Nginx reverse proxy).

---

## 🏗️ Master Architecture Overview

```
 ┌───────────────────────────┐                ┌───────────────────────────┐
 │   Vercel Global CDN       │                │       Ubuntu VPS          │
 │                           │                │                           │
 │  React 19 + Vite Frontend │ ──API Fetch──> │ Express REST API (:3000) │
 │  https://app.vercel.app   │ <──JSON/Data── │ Local DB (stark_anime.db) │
 │                           │                │ FFmpeg Video Transcoder   │
 └───────────────────────────┘                │ Python Telegram Bot       │
                                              │ Nginx Reverse Proxy (:80) │
                                              └───────────────────────────┘
```

1. **Client Requests (Vercel):** The frontend renders on Vercel and connects directly to the VPS backend endpoint using the `VITE_API_URL` environment variable.
2. **Backend Services (VPS):** Express API, FFmpeg transcoder, and Telegram Bot run on VPS managed by PM2.
3. **Database & Storage (VPS):** No Cloud DB needed! All state is saved locally in `data/stark_anime.db.json` on the VPS. Transcoded multi-quality videos (1080p, 720p, 480p, 360p) are served directly from `/uploads/` with HTTP Range headers for fast seeking.

---

## 🚀 Step 1: VPS Backend & Transcoder Setup

Connect to your Ubuntu/Debian VPS via SSH and install required packages.

### 1.1 Install VPS System Dependencies
```bash
# Update Ubuntu package manager
sudo apt update && sudo apt upgrade -y

# Install FFmpeg, Curl, Git, Build tools, and Nginx
sudo apt install -y curl git nginx ffmpeg build-essential

# Install Bun runtime
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install PM2 globally
npm install -g pm2
```

---

### 1.2 Clone Repository & Install Backend
```bash
# Clone repository to VPS
git clone <YOUR_GIT_REPOSITORY_URL> /var/www/stark-anime
cd /var/www/stark-anime

# Install dependencies using Bun
bun install
```

---

### 1.3 Configure VPS Environment File
Create a `.env` file in `/var/www/stark-anime/.env`:

```env
PORT=3000
NODE_ENV=production
JWT_SECRET=stark_super_secure_jwt_secret_key_2026
ADMIN_TOKEN=offline_admin_rajpapa

# Telegram Bot Credentials
TELEGRAM_BOT_TOKEN=8832195140:AAHgKP4G8N8lSUuBf7vRk3EUs35lo1YHFwQ
TELEGRAM_CHANNEL_ID=@stark_anime_storage

# Persistent Local Database File Path
DB_FILE_PATH=/var/www/stark-anime/data/stark_anime.db.json
```

---

### 1.4 Start Backend Server & Telegram Transcoder with PM2
```bash
cd /var/www/stark-anime

# 1. Start STARK Express API Web Backend
pm2 start "bun run server.ts" --name "stark-web"

# 2. Start STARK Telegram Admin Bot & Transcoder Engine
pm2 start "python3 main.py bot" --name "stark-bot"

# Save PM2 state so processes restart automatically on VPS reboot
pm2 save
pm2 startup
```

---

### 1.5 Configure Nginx Reverse Proxy with CORS on VPS

Create Nginx site configuration `/etc/nginx/sites-available/stark`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com; # Replace with your VPS Domain or IP (e.g., 123.45.67.89)

    client_max_body_size 1000M;

    # CORS Headers for Vercel Frontend Connection
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'Content-Type, Authorization, x-admin-token, x-admin-key, x-admin-password, x-telegram-init-data, x-telegram-user-id' always;

    location / {
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
            add_header Access-Control-Allow-Headers 'Content-Type, Authorization, x-admin-token, x-admin-key, x-admin-password, x-telegram-init-data, x-telegram-user-id';
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Transcoded video static uploads folder with fast byte-range seeking
    location /uploads/ {
        alias /var/www/stark-anime/data/uploads/;
        add_header Access-Control-Allow-Origin * always;
        add_header Accept-Ranges bytes;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/stark /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

*(Optional) Enable Free SSL/HTTPS on VPS domain using Certbot:*
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 🌐 Step 2: Vercel Frontend Deployment

### 2.1 Import Project to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** -> **Import Git Repository**.
3. Select your repository.

### 2.2 Configure Vercel Project Settings
- **Framework Preset:** `Vite`
- **Build Command:** `vite build`
- **Output Directory:** `dist`

### 2.3 Add Environment Variables on Vercel
In Vercel **Environment Variables** section, add:

| Key | Value | Description |
| --- | --- | --- |
| `VITE_API_URL` | `https://api.yourdomain.com` *(or `http://YOUR_VPS_IP:3000`)* | VPS Backend API Domain or IP |

### 2.4 Deploy
Click **Deploy**. Vercel will build the frontend assets and assign your domain (e.g., `https://stark-anime.vercel.app`).

---

## 🔗 Step 3: Verify Frontend & Backend Connection

1. Open your Vercel URL (e.g. `https://stark-anime.vercel.app`).
2. Open Browser **Developer Tools (F12)** -> **Network Tab**.
3. Observe network requests:
   - Request to `/api/home` should connect to `https://api.yourdomain.com/api/home` and return HTTP 200 OK.
4. Open `/admin` route on Vercel:
   - **Username:** `rajpapa` or `admin`
   - **Password:** `28@Rajpapa`
   - Manage catalog, banners, movies, and episodes!

---

## 🤖 Telegram Bot Video Transcoding Workflow

Send videos directly to your Telegram Admin Bot on VPS to generate 1080p, 720p, 480p, and 360p resolutions:

1. Send `/addanime Solo Leveling` to create a series in the catalog.
2. Send any video file to the Telegram bot with caption:
   `Anime: <anime_id> | Season: 1 | Ep: 1 | Title: Episode Title`
3. The bot will automatically:
   - Download the video file on VPS.
   - Run FFmpeg to encode 1080p, 720p, 480p, and 360p MP4 videos with fast streaming headers.
   - Save stream URLs in `data/stark_anime.db.json`.
4. Users watching on Vercel frontend can switch qualities in real-time!

---

## 🔑 Default Admin Credentials

- **Admin Route:** `/admin`
- **Username:** `rajpapa` or `admin`
- **Password:** `28@Rajpapa`
